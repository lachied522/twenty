import { spawn, type ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { type Readable, type Writable } from 'stream';

import { isDefined } from 'twenty-shared/utils';

import { DEFAULT_CODE_INTERPRETER_TIMEOUT_MS } from 'src/engine/core-modules/code-interpreter/code-interpreter.constants';
import { getMimeType } from 'src/engine/core-modules/code-interpreter/utils/get-mime-type.util';

import {
  type CodeExecutionResult,
  type CodeInterpreterDriver,
  type ExecutionContext,
  type InputFile,
  type OutputFile,
  type StreamCallbacks,
} from './interfaces/code-interpreter-driver.interface';

export type DockerDriverOptions = {
  image: string;
  timeoutMs?: number;
  idleTimeoutMs?: number;
  memory: string;
  cpus: string;
  pidsLimit: number;
  maxSessions: number;
  network?: string;
};

type KernelResponse = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type DockerSession = {
  containerName: string;
  child: ChildProcess;
  controlIn: Writable;
  controlOut: Readable;
  controlBuffer: string;
  pending?: {
    resolve: (response: KernelResponse) => void;
    reject: (error: Error) => void;
  };
  lastUsedAt: number;
  hasExited: boolean;
};

const dockerCliEnv = (): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH,
  DOCKER_HOST: process.env.DOCKER_HOST,
  HOME: process.env.HOME,
});

const toContainerName = (sessionId: string): string =>
  `twenty-ci-${sessionId.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 80)}`;

export class DockerDriver implements CodeInterpreterDriver {
  private readonly sessions = new Map<string, DockerSession>();

  constructor(private readonly options: DockerDriverOptions) {}

  async execute(
    code: string,
    files?: InputFile[],
    context?: ExecutionContext,
    callbacks?: StreamCallbacks,
  ): Promise<CodeExecutionResult> {
    const sessionId = context?.sessionId;

    if (!isDefined(sessionId)) {
      return {
        stdout: '',
        stderr: 'Docker code interpreter requires a chat session',
        exitCode: 1,
        files: [],
        error: 'Docker code interpreter requires a chat session',
      };
    }

    const session = await this.getOrCreateSession(sessionId, context?.env);

    await this.execInContainer(session.containerName, [
      'rm',
      '-rf',
      '/home/user/output',
    ]);
    await this.execInContainer(session.containerName, [
      'mkdir',
      '-p',
      '/home/user/output',
    ]);

    for (const file of files ?? []) {
      await this.copyFileIntoContainer({
        containerName: session.containerName,
        filename: basename(file.filename),
        content: file.content,
      });
    }

    const timeoutMs =
      this.options.timeoutMs ?? DEFAULT_CODE_INTERPRETER_TIMEOUT_MS;

    let response: KernelResponse;

    try {
      response = await this.runInSession(session, code, timeoutMs);
    } catch (error) {
      session.hasExited = true;
      this.sessions.delete(sessionId);
      session.child.kill('SIGKILL');
      await this.removeContainer(session.containerName);

      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }

    this.streamCaptured(response, callbacks);

    const outputFiles = await this.collectOutputFiles(
      session.containerName,
      callbacks,
    );

    return {
      stdout: response.stdout,
      stderr: response.stderr,
      exitCode: response.exitCode,
      files: outputFiles,
    };
  }

  async releaseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!isDefined(session)) {
      await this.removeContainer(toContainerName(sessionId));

      return;
    }

    session.hasExited = true;
    this.sessions.delete(sessionId);
    session.child.kill('SIGKILL');
    await this.removeContainer(session.containerName);
  }

  async sweepExpiredSessions(maxAgeMs: number): Promise<number> {
    const idleTimeoutMs = this.options.idleTimeoutMs ?? maxAgeMs;
    const cutoff = Date.now() - Math.min(maxAgeMs, idleTimeoutMs);
    let reclaimedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastUsedAt < cutoff || session.hasExited) {
        await this.releaseSession(sessionId);
        reclaimedCount += 1;
      }
    }

    return reclaimedCount;
  }

  private async getOrCreateSession(
    sessionId: string,
    env?: Record<string, string>,
  ): Promise<DockerSession> {
    const existing = this.sessions.get(sessionId);

    if (isDefined(existing) && !existing.hasExited) {
      existing.lastUsedAt = Date.now();

      return existing;
    }

    if (isDefined(existing)) {
      this.sessions.delete(sessionId);
    }

    if (this.sessions.size >= this.options.maxSessions) {
      throw new Error(
        `Docker code interpreter is at the maximum of ${this.options.maxSessions} concurrent sessions`,
      );
    }

    const containerName = toContainerName(sessionId);

    await this.removeContainer(containerName);

    const dockerArgs = [
      'run',
      '-i',
      '--name',
      containerName,
      '--memory',
      this.options.memory,
      '--cpus',
      this.options.cpus,
      '--pids-limit',
      String(this.options.pidsLimit),
      '-e',
      `KERNEL_IDLE_TIMEOUT_MS=${this.options.idleTimeoutMs ?? 0}`,
      '-e',
      `TWENTY_SERVER_URL=${env?.TWENTY_SERVER_URL ?? ''}`,
      '-e',
      `TWENTY_API_TOKEN=${env?.TWENTY_API_TOKEN ?? ''}`,
      '-e',
      `TWENTY_DRIVE_TOKEN=${env?.TWENTY_DRIVE_TOKEN ?? ''}`,
    ];

    if (isDefined(this.options.network) && this.options.network !== '') {
      dockerArgs.push('--network', this.options.network);
    }

    dockerArgs.push(this.options.image);

    const child = spawn('docker', dockerArgs, {
      env: dockerCliEnv(),
    });

    if (!isDefined(child.stdin) || !isDefined(child.stdout)) {
      child.kill('SIGKILL');
      throw new Error('Docker sandbox failed to expose stdin/stdout');
    }

    const session: DockerSession = {
      containerName,
      child,
      controlIn: child.stdin,
      controlOut: child.stdout,
      controlBuffer: '',
      lastUsedAt: Date.now(),
      hasExited: false,
    };

    child.on('exit', () => {
      session.hasExited = true;
      this.sessions.delete(sessionId);
      void this.removeContainer(containerName);
    });

    session.controlOut.setEncoding('utf8');
    session.controlOut.on('data', (chunk: string) => {
      session.controlBuffer += chunk;
      this.flushControlBuffer(session);
    });

    this.sessions.set(sessionId, session);

    await this.waitUntilRunning(containerName);

    return session;
  }

  private async waitUntilRunning(containerName: string): Promise<void> {
    const deadline = Date.now() + 15_000;

    while (Date.now() < deadline) {
      const isRunning = await this.isContainerRunning(containerName);

      if (isRunning) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error(
      `Docker sandbox ${containerName} did not start within 15 seconds`,
    );
  }

  private isContainerRunning(containerName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(
        'docker',
        ['inspect', '-f', '{{.State.Running}}', containerName],
        { env: dockerCliEnv() },
      );
      let stdout = '';

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.on('exit', (code) => {
        resolve(code === 0 && stdout.trim() === 'true');
      });
      child.on('error', () => resolve(false));
    });
  }

  private flushControlBuffer(session: DockerSession): void {
    const newlineIndex = session.controlBuffer.indexOf('\n');

    if (newlineIndex === -1 || !isDefined(session.pending)) {
      return;
    }

    const line = session.controlBuffer.slice(0, newlineIndex);
    session.controlBuffer = session.controlBuffer.slice(newlineIndex + 1);

    try {
      const response = JSON.parse(line) as KernelResponse;

      session.pending.resolve(response);
    } catch (error) {
      session.pending.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    session.pending = undefined;
  }

  private runInSession(
    session: DockerSession,
    code: string,
    timeoutMs: number,
  ): Promise<KernelResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Code interpreter timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      session.pending = {
        resolve: (response) => {
          clearTimeout(timeout);
          session.lastUsedAt = Date.now();
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      };

      const payload = JSON.stringify({
        code: Buffer.from(code, 'utf8').toString('base64'),
      });

      session.controlIn.write(`${payload}\n`);
    });
  }

  private async copyFileIntoContainer({
    containerName,
    filename,
    content,
  }: {
    containerName: string;
    filename: string;
    content: Buffer;
  }): Promise<void> {
    const tempFilePath = join(tmpdir(), `twenty-ci-${filename}`);

    await fs.writeFile(tempFilePath, content);

    try {
      await this.spawnDockerAndWait([
        'cp',
        tempFilePath,
        `${containerName}:/home/user/${filename}`,
      ]);
    } finally {
      await fs.rm(tempFilePath, { force: true });
    }
  }

  private async collectOutputFiles(
    containerName: string,
    callbacks?: StreamCallbacks,
  ): Promise<OutputFile[]> {
    const hostOutputDir = await fs.mkdtemp(join(tmpdir(), 'twenty-ci-out-'));

    try {
      await this.spawnDockerAndWait([
        'cp',
        `${containerName}:/home/user/output/.`,
        hostOutputDir,
      ]);
    } catch {
      await fs.rm(hostOutputDir, { recursive: true, force: true });

      return [];
    }

    const outputFiles: OutputFile[] = [];

    try {
      const outputEntries = await fs.readdir(hostOutputDir, {
        withFileTypes: true,
      });

      for (const entry of outputEntries) {
        if (!entry.isFile()) {
          continue;
        }

        const content = await fs.readFile(join(hostOutputDir, entry.name));
        const outputFile: OutputFile = {
          filename: entry.name,
          content,
          mimeType: getMimeType(entry.name),
        };

        outputFiles.push(outputFile);
        await callbacks?.onResult?.(outputFile);
      }
    } finally {
      await fs.rm(hostOutputDir, { recursive: true, force: true });
    }

    return outputFiles;
  }

  private streamCaptured(
    response: KernelResponse,
    callbacks?: StreamCallbacks,
  ): void {
    for (const line of response.stdout.split('\n')) {
      if (line) {
        callbacks?.onStdout?.(line);
      }
    }

    for (const line of response.stderr.split('\n')) {
      if (line) {
        callbacks?.onStderr?.(line);
      }
    }
  }

  private execInContainer(
    containerName: string,
    command: string[],
  ): Promise<void> {
    return this.spawnDockerAndWait(['exec', containerName, ...command]);
  }

  private removeContainer(containerName: string): Promise<void> {
    return this.spawnDockerAndWait(['rm', '-f', containerName]).catch(
      () => undefined,
    );
  }

  private spawnDockerAndWait(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', args, { env: dockerCliEnv() });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();

          return;
        }

        reject(new Error(`docker ${args.join(' ')} exited with code ${code}`));
      });
    });
  }
}

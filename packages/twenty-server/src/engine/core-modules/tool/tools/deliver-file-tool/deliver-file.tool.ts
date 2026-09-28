import { Injectable } from '@nestjs/common';

import { FileFolder } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { DeliverFileInputZodSchema } from 'src/engine/core-modules/tool/tools/deliver-file-tool/deliver-file-tool.schema';
import { type GeneratedImageFile } from 'src/engine/core-modules/tool/tools/image-generate-tool/types/generated-image-file.type';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

const DELIVERABLE_FILE_FOLDERS = new Set<string>([
  FileFolder.AgentChat,
  FileFolder.Drive,
]);

@Injectable()
export class DeliverFileTool implements Tool {
  description =
    'Show a chat file to the user as a downloadable card. Pass the fileId from image_generate, code_interpreter, or a user upload. Use this when the user should see or download the file in chat; skip it when you are only attaching the file to email, Drive, or a PDF.';

  inputSchema = DeliverFileInputZodSchema;

  constructor(
    @InjectWorkspaceScopedRepository(FileEntity)
    private readonly fileRepository: WorkspaceScopedRepository<FileEntity>,
    private readonly fileUrlService: FileUrlService,
  ) {}

  async execute(
    parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ToolOutput<GeneratedImageFile>> {
    const parseResult = DeliverFileInputZodSchema.safeParse(parameters);

    if (!parseResult.success) {
      return {
        success: false,
        message: 'deliver_file requires fileId',
        error: parseResult.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      };
    }

    const { fileId } = parseResult.data;
    const file = await this.fileRepository.findOne(context.workspaceId, {
      where: { id: fileId },
    });

    if (!isDefined(file) || !isDefined(file.path)) {
      return {
        success: false,
        message: 'File not found',
        error:
          'File not found in this chat or Drive. deliver_file needs a fileId from image_generate, code_interpreter, or a user upload.',
      };
    }

    const fileFolder = file.path.split('/')[0];

    if (!DELIVERABLE_FILE_FOLDERS.has(fileFolder)) {
      return {
        success: false,
        message: 'File cannot be delivered',
        error: 'Only chat and Drive files can be shown in this conversation.',
      };
    }

    const signedUrl = await this.fileUrlService.signFileByIdUrl({
      fileId: file.id,
      workspaceId: context.workspaceId,
      fileFolder: fileFolder as FileFolder,
    });

    const pathBasename = file.path.split('/').pop() ?? file.id;
    const fileIdPrefix = `${file.id}-`;
    const filename = pathBasename.startsWith(fileIdPrefix)
      ? pathBasename.slice(fileIdPrefix.length)
      : pathBasename;

    return {
      success: true,
      message: `Delivered ${filename}`,
      result: {
        fileId: file.id,
        filename,
        url: signedUrl,
        mimeType: file.mimeType,
        sizeBytes: Number(file.size),
      },
    };
  }
}

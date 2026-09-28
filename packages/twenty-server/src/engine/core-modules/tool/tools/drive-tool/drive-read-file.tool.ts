import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { toDriveToolError } from 'src/engine/core-modules/tool/tools/drive-tool/drive-list-spaces.tool';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export const DriveReadFileInputZodSchema = z.object({
  path: z
    .string()
    .optional()
    .describe(
      'Virtual Drive path from list_drive_items.virtualPath, e.g. /personal/notes.md. Prefer this over fileId. Text and markdown only.',
    ),
  fileId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Drive item id. Prefer path. Never pass a chat harvest fileId here — use copy_file_to_drive for that.',
    ),
});

@Injectable()
export class DriveReadFileTool implements Tool {
  description =
    'Read a small text or markdown Drive file into chat. Pass path (virtualPath from list_drive_items). Prefer path over fileId. Do not use this for PDFs, images, spreadsheets, or large files — pull those in the sandbox with drive.pull.';
  inputSchema = DriveReadFileInputZodSchema;

  constructor(private readonly driveService: DriveService) {}

  async execute(
    parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ToolOutput> {
    if (!isNonEmptyString(context.userWorkspaceId)) {
      return {
        success: false,
        message: 'Drive tools require a logged-in user',
        error: 'userWorkspaceId is missing',
      };
    }

    const parseResult = DriveReadFileInputZodSchema.safeParse(parameters);

    if (!parseResult.success) {
      return {
        success: false,
        message:
          'read_drive_file requires path (virtualPath from list_drive_items, e.g. /personal/notes.md). PDFs, images, and Office files cannot be read with this tool — use code_interpreter with drive.pull.',
        error: parseResult.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      };
    }

    const { path, fileId } = parseResult.data;

    if (!isNonEmptyString(path) && !isNonEmptyString(fileId)) {
      return {
        success: false,
        message:
          'read_drive_file requires path (virtualPath from list_drive_items, e.g. /personal/notes.md). PDFs, images, and Office files cannot be read with this tool — use code_interpreter with drive.pull.',
        error:
          'path is required. Use virtualPath from list_drive_items. Never pass only a chat harvest fileId — use copy_file_to_drive for that.',
      };
    }

    try {
      const file = await this.driveService.readFile({
        path,
        fileId,
        principal: {
          workspaceId: context.workspaceId,
          userWorkspaceId: context.userWorkspaceId,
        },
      });

      return {
        success: true,
        message: `Read ${path ?? fileId}`,
        result: file,
      };
    } catch (error) {
      return toDriveToolError(error, `Failed to read ${path ?? fileId}`);
    }
  }
}

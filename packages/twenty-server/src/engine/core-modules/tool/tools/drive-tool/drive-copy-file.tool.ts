import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { toDriveToolError } from 'src/engine/core-modules/tool/tools/drive-tool/drive-list-spaces.tool';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export const DriveCopyFileInputZodSchema = z.object({
  fileId: z
    .string()
    .uuid()
    .describe(
      'fileId of a file already harvested into this chat (image_generate, code_interpreter, or user upload) or an existing Drive file',
    ),
  path: z
    .string()
    .describe('Destination Drive virtual path, e.g. /personal/hello_world.pdf'),
});

@Injectable()
export class DriveCopyFileTool implements Tool {
  description =
    'Copy a file already in this chat (harvested code_interpreter output, fileId from the tool result) into Drive at a virtual path such as /personal/hello_world.pdf. Prefer publishing from the sandbox with drive.publish in the same code_interpreter call that created the file.';
  inputSchema = DriveCopyFileInputZodSchema;

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

    const parseResult = DriveCopyFileInputZodSchema.safeParse(parameters);

    if (!parseResult.success) {
      return {
        success: false,
        message:
          'copy_file_to_drive requires fileId (chat harvest) and path (e.g. /personal/hello_world.pdf)',
        error: parseResult.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      };
    }

    const { fileId, path } = parseResult.data;

    try {
      const item = await this.driveService.copyFileToDrive({
        fileId,
        path,
        principal: {
          workspaceId: context.workspaceId,
          userWorkspaceId: context.userWorkspaceId,
        },
      });

      return {
        success: true,
        message: `Copied file to ${path}`,
        result: item,
      };
    } catch (error) {
      return toDriveToolError(error, `Failed to copy file to ${path}`);
    }
  }
}

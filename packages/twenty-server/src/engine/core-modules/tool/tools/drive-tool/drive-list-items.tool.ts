import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { toDriveToolError } from 'src/engine/core-modules/tool/tools/drive-tool/drive-list-spaces.tool';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export const DriveListItemsInputZodSchema = z.object({
  path: z
    .string()
    .describe(
      'Virtual Drive path to list, e.g. /personal, /spaces/general, /shared',
    ),
});

@Injectable()
export class DriveListItemsTool implements Tool {
  description =
    'List files and folders at a Drive virtual path. Use /personal, /spaces/{slug}, or /shared. Each item includes virtualPath — pass that to read_drive_file, copy_file_to_drive, share_drive_item, and drive.pull. Do not ingest large or binary files — use code_interpreter with drive.pull for those.';
  inputSchema = DriveListItemsInputZodSchema;

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

    const { path } = parameters as { path: string };

    try {
      const items = await this.driveService.listItems({
        path,
        principal: {
          workspaceId: context.workspaceId,
          userWorkspaceId: context.userWorkspaceId,
        },
      });

      return {
        success: true,
        message: `Listed ${items.length} item(s) at ${path}`,
        result: { items },
      };
    } catch (error) {
      return toDriveToolError(error, `Failed to list Drive items at ${path}`);
    }
  }
}

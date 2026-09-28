import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { toDriveToolError } from 'src/engine/core-modules/tool/tools/drive-tool/drive-list-spaces.tool';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export const DriveShareItemInputZodSchema = z.object({
  path: z.string().describe('Virtual path of a personal Drive item to share'),
  userWorkspaceId: z
    .string()
    .uuid()
    .describe('Recipient member userWorkspaceId'),
  accessLevel: z
    .enum(['READ', 'READ_WRITE'])
    .describe('READ or READ_WRITE for the shared item only'),
});

@Injectable()
export class DriveShareItemTool implements Tool {
  description =
    "Share a personal Drive file or folder with a coworker. Recipients (and their agents) can only access that item, not the rest of the owner's personal space. Organisation spaces are granted via roles, not this tool.";
  inputSchema = DriveShareItemInputZodSchema;

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

    const { path, userWorkspaceId, accessLevel } = parameters as {
      path: string;
      userWorkspaceId: string;
      accessLevel: 'READ' | 'READ_WRITE';
    };

    try {
      const share = await this.driveService.shareItem({
        path,
        recipientUserWorkspaceId: userWorkspaceId,
        accessLevel,
        principal: {
          workspaceId: context.workspaceId,
          userWorkspaceId: context.userWorkspaceId,
        },
      });

      return {
        success: true,
        message: `Shared ${path}`,
        result: share,
      };
    } catch (error) {
      return toDriveToolError(error, `Failed to share ${path}`);
    }
  }
}

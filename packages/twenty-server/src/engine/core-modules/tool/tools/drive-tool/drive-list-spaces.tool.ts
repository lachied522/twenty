import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { DriveException } from 'src/engine/core-modules/drive/drive.exception';
import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';

export const DriveListSpacesInputZodSchema = z.object({});

@Injectable()
export class DriveListSpacesTool implements Tool {
  description =
    'List Drive spaces the current user can see: personal, organisation spaces they have a grant on, and Shared with me. Hidden organisation spaces are omitted. Use this before listing items.';
  inputSchema = DriveListSpacesInputZodSchema;

  constructor(private readonly driveService: DriveService) {}

  async execute(
    _parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ToolOutput> {
    if (!isNonEmptyString(context.userWorkspaceId)) {
      return {
        success: false,
        message: 'Drive tools require a logged-in user',
        error: 'userWorkspaceId is missing',
      };
    }

    try {
      const spaces = await this.driveService.listSpaces({
        workspaceId: context.workspaceId,
        userWorkspaceId: context.userWorkspaceId,
      });

      return {
        success: true,
        message: `Found ${spaces.length} Drive space(s)`,
        result: { spaces },
      };
    } catch (error) {
      return toDriveToolError(error, 'Failed to list Drive spaces');
    }
  }
}

export const toDriveToolError = (
  error: unknown,
  message: string,
): ToolOutput => {
  if (error instanceof DriveException) {
    return {
      success: false,
      message,
      error: error.message,
    };
  }

  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : String(error),
  };
};

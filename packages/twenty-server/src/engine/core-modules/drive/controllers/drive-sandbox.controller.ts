import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  StreamableFile,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { type RawBodyRequest } from '@nestjs/common/interfaces';
import { type Request } from 'express';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { ApiPath } from 'twenty-shared/types';

import { DriveRestApiExceptionFilter } from 'src/engine/core-modules/drive/drive-rest-api-exception.filter';
import { DRIVE_MAX_SANDBOX_BYTES } from 'src/engine/core-modules/drive/drive.constants';
import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';
import { DriveTokenGuard } from 'src/engine/core-modules/drive/guards/drive-token.guard';
import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

@Controller(`${ApiPath.Rest}/drive/sandbox`)
@UseGuards(DriveTokenGuard, NoPermissionGuard)
@UseFilters(DriveRestApiExceptionFilter)
export class DriveSandboxController {
  constructor(private readonly driveService: DriveService) {}

  @Get('pull')
  async pull(
    @Req() request: Request,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ): Promise<StreamableFile> {
    const workspaceId = request.workspaceId;

    if (!isNonEmptyString(workspaceId)) {
      throw new DriveException(
        'Workspace is required',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const file = await this.driveService.readFileBytes({
      path,
      principal: {
        workspaceId,
        userWorkspaceId,
      },
    });

    return new StreamableFile(file.content, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Post('publish')
  async publish(
    @Req() request: RawBodyRequest<Request>,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    const workspaceId = request.workspaceId;
    const sourceFile = request.rawBody;

    if (
      !isNonEmptyString(workspaceId) ||
      !isNonEmptyString(path) ||
      !isDefined(sourceFile)
    ) {
      throw new DriveException(
        'path query and a binary body are required',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    if (sourceFile.length > DRIVE_MAX_SANDBOX_BYTES) {
      throw new DriveException(
        'Published file is too large',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    return this.driveService.publishBytes({
      path,
      sourceFile,
      principal: {
        workspaceId,
        userWorkspaceId,
      },
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { ApiPath, type DriveAccessLevel } from 'twenty-shared/types';

import { DriveRestApiExceptionFilter } from 'src/engine/core-modules/drive/drive-rest-api-exception.filter';
import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@Controller(`${ApiPath.Rest}/drive`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, NoPermissionGuard)
@UseFilters(DriveRestApiExceptionFilter)
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('spaces')
  async listSpaces(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.driveService.listSpaces({
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Get('items')
  async listItems(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    return this.driveService.listItems({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Get('stat')
  async statItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    return this.driveService.statItem({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Get('read')
  async readFile(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    return this.driveService.readFile({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Get('download-url')
  async getDownloadUrl(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    return {
      url: await this.driveService.getDownloadUrl({
        path,
        principal: { workspaceId: workspace.id, userWorkspaceId },
      }),
    };
  }

  @Post('mkdir')
  async createFolder(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
  ) {
    return this.driveService.createFolder({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Post('write')
  async writeFile(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
    @Body('content') content: string,
  ) {
    return this.driveService.writeFile({
      path,
      content,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Post('move')
  async moveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
    @Body('destinationPath') destinationPath: string,
  ) {
    return this.driveService.moveItem({
      path,
      destinationPath,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Post('rename')
  async renameItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
    @Body('newName') newName: string,
  ) {
    return this.driveService.renameItem({
      path,
      newName,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Delete('item')
  async deleteItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Query('path') path: string,
  ) {
    return {
      success: await this.driveService.deleteItem({
        path,
        principal: { workspaceId: workspace.id, userWorkspaceId },
      }),
    };
  }

  @Post('share')
  async shareItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
    @Body('userWorkspaceId') recipientUserWorkspaceId: string,
    @Body('accessLevel') accessLevel: DriveAccessLevel,
  ) {
    return this.driveService.shareItem({
      path,
      recipientUserWorkspaceId,
      accessLevel,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Post('unshare')
  async unshareItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Body('path') path: string,
    @Body('userWorkspaceId') recipientUserWorkspaceId: string,
  ) {
    return {
      success: await this.driveService.unshareItem({
        path,
        recipientUserWorkspaceId,
        principal: { workspaceId: workspace.id, userWorkspaceId },
      }),
    };
  }
}

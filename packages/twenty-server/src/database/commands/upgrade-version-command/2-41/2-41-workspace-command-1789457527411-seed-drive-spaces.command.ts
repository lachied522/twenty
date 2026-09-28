import { InjectRepository } from '@nestjs/typeorm';
import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';
import { type Repository } from 'typeorm';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { DriveProvisioningService } from 'src/engine/core-modules/drive/services/drive-provisioning.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';

@RegisteredWorkspaceCommand('2.41.0', 1789457527411)
@Command({
  name: 'upgrade:2-41:seed-drive-spaces',
  description:
    'Seed organisation Drive spaces and personal spaces for existing workspaces',
})
export class SeedDriveSpacesCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly driveProvisioningService: DriveProvisioningService,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    if (options.dryRun === true) {
      this.logger.log(
        `Would seed Drive spaces for workspace ${workspaceId}`,
      );

      return;
    }

    await this.driveProvisioningService.seedOrganisationSpaces({
      workspaceId,
    });

    const userWorkspaces = await this.userWorkspaceRepository.find({
      where: { workspaceId },
    });

    for (const userWorkspace of userWorkspaces) {
    if (!isDefined(userWorkspace.deletedAt)) {
        await this.driveProvisioningService.createPersonalSpace({
          workspaceId,
          userWorkspaceId: userWorkspace.id,
        });
      }
    }
  }
}

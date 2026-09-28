import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { CorrectStandardFieldAcronymCasingCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789331219041-correct-standard-field-acronym-casing.command';
import { BackfillWorkspaceWorkflowIdOnWorkflowsCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789350000002-backfill-workspace-workflow-id-on-workflows.command';
import { BackfillCoreVersionPointersCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789370101009-backfill-core-version-pointers.command';
import { MakeStandardChildObjectsInheritedCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789373200001-make-standard-child-objects-inherited.command';
import { SeedDriveSpacesCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789457527411-seed-drive-spaces.command';
import { ReconcileStandardSkills241Command } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789467386285-reconcile-standard-skills.command';
import { UngateAiChatCommandMenuItemsCommand } from 'src/database/commands/upgrade-version-command/2-41/2-41-workspace-command-1789878358625-ungate-ai-chat-command-menu-items.command';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { DriveModule } from 'src/engine/core-modules/drive/drive.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceMigrationRunnerModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/workspace-migration-runner.module';
import { WorkspaceSchemaMigrationRunnerActionHandlersModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/action-handlers/workspace-schema-migration-runner-action-handlers.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FieldMetadataEntity, UserWorkspaceEntity]),
    ApplicationModule,
    DriveModule,
    WorkspaceCacheModule,
    WorkspaceIteratorModule,
    WorkspaceMigrationModule,
    WorkspaceMigrationRunnerModule,
    WorkspaceSchemaMigrationRunnerActionHandlersModule,
  ],
  providers: [
    CorrectStandardFieldAcronymCasingCommand,
    BackfillWorkspaceWorkflowIdOnWorkflowsCommand,
    BackfillCoreVersionPointersCommand,
    MakeStandardChildObjectsInheritedCommand,
    SeedDriveSpacesCommand,
    ReconcileStandardSkills241Command,
    UngateAiChatCommandMenuItemsCommand,
  ],
})
export class V2_41_UpgradeVersionCommandModule {}

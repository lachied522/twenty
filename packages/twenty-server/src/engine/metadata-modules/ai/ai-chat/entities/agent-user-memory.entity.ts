import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CREATE_AGENT_USER_MEMORY_CORE_TABLE_UPGRADE_COMMAND_NAME } from 'src/database/commands/upgrade-version-command/2-41/create-agent-user-memory-core-table-upgrade-command-name.constant';
import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import type { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';

@Entity({ name: 'agentUserMemory', schema: 'core' })
@WasIntroducedInUpgrade({
  upgradeCommandName: CREATE_AGENT_USER_MEMORY_CORE_TABLE_UPGRADE_COMMAND_NAME,
})
@Index('IDX_AGENT_USER_MEMORY_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_AGENT_USER_MEMORY_USER_WORKSPACE_ID', ['userWorkspaceId'])
@Index('IDX_AGENT_USER_MEMORY_WORKSPACE_ID_USER_WORKSPACE_ID', [
  'workspaceId',
  'userWorkspaceId',
])
export class AgentUserMemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne('WorkspaceEntity', { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_AGENT_USER_MEMORY_WORKSPACE_ID',
  })
  workspace: EntityRelation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  userWorkspaceId: string;

  @ManyToOne(() => UserWorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userWorkspaceId',
    foreignKeyConstraintName: 'FK_AGENT_USER_MEMORY_USER_WORKSPACE_ID',
  })
  userWorkspace: EntityRelation<UserWorkspaceEntity>;

  @Column({ nullable: false, type: 'text' })
  content: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

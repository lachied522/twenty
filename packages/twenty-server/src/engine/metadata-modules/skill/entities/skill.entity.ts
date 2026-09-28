import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { type SkillKind } from 'twenty-shared/types';

import { ADD_IS_SYSTEM_TO_SKILL_UPGRADE_COMMAND_NAME } from 'src/database/commands/upgrade-version-command/2-40/add-is-system-to-skill-upgrade-command-name.constant';
import { ADD_IS_HIDDEN_TO_SKILL_UPGRADE_COMMAND_NAME } from 'src/database/commands/upgrade-version-command/2-41/add-is-hidden-to-skill-upgrade-command-name.constant';
import { ADD_SKILL_OWNERSHIP_AND_SHARES_UPGRADE_COMMAND_NAME } from 'src/database/commands/upgrade-version-command/2-41/add-skill-ownership-and-shares-upgrade-command-name.constant';
import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { SyncableEntity } from 'src/engine/workspace-manager/types/syncable-entity.interface';

@Entity('skill')
@Index('IDX_SKILL_ID_IS_ACTIVE', ['id', 'isActive'])
@Index('IDX_SKILL_OWNER_USER_WORKSPACE_ID', ['ownerUserWorkspaceId'])
@Index('IDX_SKILL_NAME_WORKSPACE_ID_NULL_OWNER_UNIQUE', ['workspaceId', 'name'], {
  unique: true,
  where: '"isActive" = true AND "ownerUserWorkspaceId" IS NULL',
})
@Index(
  'IDX_SKILL_NAME_WORKSPACE_ID_OWNER_UNIQUE',
  ['workspaceId', 'ownerUserWorkspaceId', 'name'],
  {
    unique: true,
    where: '"isActive" = true AND "ownerUserWorkspaceId" IS NOT NULL',
  },
)
export class SkillEntity
  extends SyncableEntity
  implements Required<SkillEntity>
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  label: string;

  @Column({ nullable: true, type: 'varchar' })
  icon: string | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: false, type: 'text' })
  content: string;

  @Column({ default: false })
  isCustom: boolean;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_IS_SYSTEM_TO_SKILL_UPGRADE_COMMAND_NAME,
  })
  @Column({ default: false })
  isSystem: boolean;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_SKILL_OWNERSHIP_AND_SHARES_UPGRADE_COMMAND_NAME,
  })
  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'WORKSPACE', 'USER', 'GIZMO'],
    default: 'WORKSPACE',
  })
  kind: SkillKind;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_SKILL_OWNERSHIP_AND_SHARES_UPGRADE_COMMAND_NAME,
  })
  @Column({ nullable: true, type: 'uuid' })
  ownerUserWorkspaceId: string | null;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_SKILL_OWNERSHIP_AND_SHARES_UPGRADE_COMMAND_NAME,
  })
  @Column({ type: 'text', array: true, nullable: true })
  toolkitSlugs: string[] | null;

  @WasIntroducedInUpgrade({
    upgradeCommandName: ADD_IS_HIDDEN_TO_SKILL_UPGRADE_COMMAND_NAME,
  })
  @Column({ default: false })
  isHidden: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

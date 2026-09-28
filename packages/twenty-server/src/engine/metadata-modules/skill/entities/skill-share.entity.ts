import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import {
  type DriveAccessLevel,
  type DrivePrincipalType,
} from 'twenty-shared/types';

import { SkillEntity } from 'src/engine/metadata-modules/skill/entities/skill.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'skillShare', schema: 'core' })
@Unique('IDX_SKILL_SHARE_SKILL_PRINCIPAL_UNIQUE', [
  'skillId',
  'principalType',
  'principalId',
])
@Index('IDX_SKILL_SHARE_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_SKILL_SHARE_PRINCIPAL', ['principalType', 'principalId'])
export class SkillShareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_SKILL_SHARE_WORKSPACE_ID',
  })
  workspace: Relation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  skillId: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'skillId',
    foreignKeyConstraintName: 'FK_SKILL_SHARE_SKILL_ID',
  })
  skill: Relation<SkillEntity>;

  @Column({
    type: 'enum',
    enum: ['ROLE', 'WORKSPACE_MEMBER'],
    nullable: false,
  })
  principalType: DrivePrincipalType;

  @Column({ type: 'uuid', nullable: false })
  principalId: string;

  @Column({
    type: 'enum',
    enum: ['READ', 'READ_WRITE'],
    nullable: false,
  })
  accessLevel: DriveAccessLevel;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

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

import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'driveSpaceGrant', schema: 'core' })
@Unique('IDX_DRIVE_SPACE_GRANT_SPACE_PRINCIPAL_UNIQUE', [
  'spaceId',
  'principalType',
  'principalId',
])
@Index('IDX_DRIVE_SPACE_GRANT_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_DRIVE_SPACE_GRANT_PRINCIPAL', ['principalType', 'principalId'])
export class DriveSpaceGrantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_SPACE_GRANT_WORKSPACE_ID',
  })
  workspace: Relation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  spaceId: string;

  @ManyToOne(() => DriveSpaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'spaceId',
    foreignKeyConstraintName: 'FK_DRIVE_SPACE_GRANT_SPACE_ID',
  })
  space: Relation<DriveSpaceEntity>;

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

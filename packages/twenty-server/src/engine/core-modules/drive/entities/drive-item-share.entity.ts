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

import { type DriveAccessLevel } from 'twenty-shared/types';

import { DriveItemEntity } from 'src/engine/core-modules/drive/entities/drive-item.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'driveItemShare', schema: 'core' })
@Unique('IDX_DRIVE_ITEM_SHARE_ITEM_USER_WORKSPACE_UNIQUE', [
  'itemId',
  'userWorkspaceId',
])
@Index('IDX_DRIVE_ITEM_SHARE_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_DRIVE_ITEM_SHARE_USER_WORKSPACE_ID', ['userWorkspaceId'])
export class DriveItemShareEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_SHARE_WORKSPACE_ID',
  })
  workspace: Relation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  itemId: string;

  @ManyToOne(() => DriveItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'itemId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_SHARE_ITEM_ID',
  })
  item: Relation<DriveItemEntity>;

  @Column({ nullable: false, type: 'uuid' })
  userWorkspaceId: string;

  @ManyToOne(() => UserWorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userWorkspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_SHARE_USER_WORKSPACE_ID',
  })
  userWorkspace: Relation<UserWorkspaceEntity>;

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

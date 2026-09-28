import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { type DriveItemKind } from 'twenty-shared/types';

import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'driveItem', schema: 'core' })
@Index('IDX_DRIVE_ITEM_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_DRIVE_ITEM_SPACE_ID', ['spaceId'])
@Index('IDX_DRIVE_ITEM_PARENT_ID', ['parentId'])
@Index('IDX_DRIVE_ITEM_FILE_ID', ['fileId'])
export class DriveItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_WORKSPACE_ID',
  })
  workspace: Relation<WorkspaceEntity>;

  @Column({ nullable: false, type: 'uuid' })
  spaceId: string;

  @ManyToOne(() => DriveSpaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'spaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_SPACE_ID',
  })
  space: Relation<DriveSpaceEntity>;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => DriveItemEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'parentId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_PARENT_ID',
  })
  parent: Relation<DriveItemEntity> | null;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: ['FILE', 'FOLDER'],
    nullable: false,
  })
  kind: DriveItemKind;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => FileEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'fileId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_FILE_ID',
  })
  file: Relation<FileEntity> | null;

  @Column({ type: 'varchar', nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserWorkspaceId: string | null;

  @ManyToOne(() => UserWorkspaceEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({
    name: 'createdByUserWorkspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_CREATED_BY_USER_WORKSPACE_ID',
  })
  createdByUserWorkspace: Relation<UserWorkspaceEntity> | null;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserWorkspaceId: string | null;

  @ManyToOne(() => UserWorkspaceEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({
    name: 'updatedByUserWorkspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_ITEM_UPDATED_BY_USER_WORKSPACE_ID',
  })
  updatedByUserWorkspace: Relation<UserWorkspaceEntity> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}

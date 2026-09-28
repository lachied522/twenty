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

import { type DriveSpaceKind } from 'twenty-shared/types';

import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'driveSpace', schema: 'core' })
@Index('IDX_DRIVE_SPACE_WORKSPACE_ID', ['workspaceId'])
@Index('IDX_DRIVE_SPACE_OWNER_USER_WORKSPACE_ID', ['ownerUserWorkspaceId'])
export class DriveSpaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'workspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_SPACE_WORKSPACE_ID',
  })
  workspace: Relation<WorkspaceEntity>;

  @Column({
    type: 'enum',
    enum: ['PERSONAL', 'ORGANISATION'],
    nullable: false,
  })
  kind: DriveSpaceKind;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  slug: string;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', nullable: false })
  pathPrefix: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserWorkspaceId: string | null;

  @ManyToOne(() => UserWorkspaceEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'ownerUserWorkspaceId',
    foreignKeyConstraintName: 'FK_DRIVE_SPACE_OWNER_USER_WORKSPACE_ID',
  })
  ownerUserWorkspace: Relation<UserWorkspaceEntity> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}

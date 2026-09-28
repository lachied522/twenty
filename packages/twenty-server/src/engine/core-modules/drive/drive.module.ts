import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import 'src/engine/core-modules/drive/drive-graphql-enums';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { DriveController } from 'src/engine/core-modules/drive/controllers/drive.controller';
import { DriveSandboxController } from 'src/engine/core-modules/drive/controllers/drive-sandbox.controller';
import { DriveItemEntity } from 'src/engine/core-modules/drive/entities/drive-item.entity';
import { DriveItemShareEntity } from 'src/engine/core-modules/drive/entities/drive-item-share.entity';
import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { DriveSpaceGrantEntity } from 'src/engine/core-modules/drive/entities/drive-space-grant.entity';
import { DriveResolver } from 'src/engine/core-modules/drive/resolvers/drive.resolver';
import { DriveTokenGuard } from 'src/engine/core-modules/drive/guards/drive-token.guard';
import { DriveAccessService } from 'src/engine/core-modules/drive/services/drive-access.service';
import { DriveProvisioningService } from 'src/engine/core-modules/drive/services/drive-provisioning.service';
import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriveSpaceEntity,
      DriveItemEntity,
      DriveSpaceGrantEntity,
      DriveItemShareEntity,
      FileEntity,
      RoleEntity,
    ]),
    FileModule,
    JwtModule,
    TokenModule,
    WorkspaceCacheStorageModule,
    UserRoleModule,
    PermissionsModule,
  ],
  providers: [
    DriveAccessService,
    DriveService,
    DriveProvisioningService,
    DriveResolver,
    DriveTokenGuard,
    JwtAuthGuard,
    provideWorkspaceScopedRepository(DriveSpaceEntity),
    provideWorkspaceScopedRepository(DriveItemEntity),
    provideWorkspaceScopedRepository(DriveSpaceGrantEntity),
    provideWorkspaceScopedRepository(DriveItemShareEntity),
    provideWorkspaceScopedRepository(FileEntity),
    provideWorkspaceScopedRepository(RoleEntity),
  ],
  controllers: [DriveController, DriveSandboxController],
  exports: [DriveAccessService, DriveService, DriveProvisioningService],
})
export class DriveModule {}

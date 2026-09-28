import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComposioResolver } from 'src/engine/core-modules/composio/resolvers/composio.resolver';
import { ComposioAccountsService } from 'src/engine/core-modules/composio/services/composio-accounts.service';
import { ComposioClientService } from 'src/engine/core-modules/composio/services/composio-client.service';
import { ComposioSessionService } from 'src/engine/core-modules/composio/services/composio-session.service';
import { ComposioService } from 'src/engine/core-modules/composio/services/composio.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserWorkspaceEntity])],
  providers: [
    ComposioClientService,
    ComposioAccountsService,
    ComposioSessionService,
    ComposioService,
    ComposioResolver,
  ],
  exports: [
    ComposioClientService,
    ComposioAccountsService,
    ComposioSessionService,
    ComposioService,
  ],
})
export class ComposioModule {}

import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { ComposioExceptionFilter } from 'src/engine/core-modules/composio/composio-exception.filter';
import {
  ComposioAccountAliasResultDTO,
  ComposioAccountDTO,
  ComposioConnectResultDTO,
  ComposioRefreshResultDTO,
  ComposioToolkitCategoryListDTO,
  ComposioToolkitDetailDTO,
  ComposioToolkitListDTO,
  ConnectComposioToolkitInput,
  RefreshComposioAccountInput,
  UpdateComposioAccountAliasInput,
} from 'src/engine/core-modules/composio/dtos/composio.dto';
import { ComposioService } from 'src/engine/core-modules/composio/services/composio.service';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@UseGuards(WorkspaceAuthGuard, NoPermissionGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(ComposioExceptionFilter, PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class ComposioResolver {
  constructor(private readonly composioService: ComposioService) {}

  @Query(() => ComposioToolkitListDTO)
  async composioToolkits(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('search', { type: () => String, nullable: true })
    search?: string | null,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
    @Args('category', { type: () => String, nullable: true })
    category?: string | null,
  ): Promise<ComposioToolkitListDTO> {
    return this.composioService.listToolkits({
      userWorkspaceId,
      search,
      cursor,
      category,
    }) as Promise<ComposioToolkitListDTO>;
  }

  @Query(() => ComposioToolkitCategoryListDTO)
  async composioToolkitCategories(): Promise<ComposioToolkitCategoryListDTO> {
    const categories = await this.composioService.listToolkitCategories();

    return categories as ComposioToolkitCategoryListDTO;
  }

  @Query(() => ComposioToolkitDetailDTO)
  async composioToolkit(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('toolkitSlug', { type: () => String }) toolkitSlug: string,
  ): Promise<ComposioToolkitDetailDTO> {
    return this.composioService.getToolkit({
      userWorkspaceId,
      toolkitSlug,
    }) as Promise<ComposioToolkitDetailDTO>;
  }

  @Mutation(() => ComposioConnectResultDTO)
  async connectComposioToolkit(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: ConnectComposioToolkitInput,
  ): Promise<ComposioConnectResultDTO> {
    return this.composioService.connectToolkit({
      userWorkspaceId,
      toolkitSlug: input.toolkitSlug,
      callbackUrl: input.callbackUrl,
      alias: input.alias,
      credentials: input.credentials,
    }) as Promise<ComposioConnectResultDTO>;
  }

  @Mutation(() => ComposioAccountDTO)
  async waitForComposioAccount(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('accountId', { type: () => String }) accountId: string,
  ): Promise<ComposioAccountDTO> {
    return this.composioService.waitForAccount({
      userWorkspaceId,
      accountId,
    }) as Promise<ComposioAccountDTO>;
  }

  @Mutation(() => ComposioRefreshResultDTO)
  async refreshComposioAccount(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: RefreshComposioAccountInput,
  ): Promise<ComposioRefreshResultDTO> {
    return this.composioService.refreshAccount({
      userWorkspaceId,
      accountId: input.accountId,
      redirectUrl: input.redirectUrl,
    });
  }

  @Mutation(() => Boolean)
  async deleteComposioAccount(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('accountId', { type: () => String }) accountId: string,
  ): Promise<boolean> {
    return this.composioService.deleteAccount({
      userWorkspaceId,
      accountId,
    });
  }

  @Mutation(() => ComposioAccountAliasResultDTO)
  async updateComposioAccountAlias(
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: UpdateComposioAccountAliasInput,
  ): Promise<ComposioAccountAliasResultDTO> {
    return this.composioService.updateAccountAlias({
      userWorkspaceId,
      accountId: input.accountId,
      alias: input.alias,
    });
  }
}

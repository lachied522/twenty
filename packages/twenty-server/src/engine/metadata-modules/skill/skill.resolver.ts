import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CreateSkillInput } from 'src/engine/metadata-modules/skill/dtos/create-skill.input';
import { ShareSkillInput } from 'src/engine/metadata-modules/skill/dtos/share-skill.input';
import { SkillDTO } from 'src/engine/metadata-modules/skill/dtos/skill.dto';
import { SkillShareDTO } from 'src/engine/metadata-modules/skill/dtos/skill-share.dto';
import { UnshareSkillInput } from 'src/engine/metadata-modules/skill/dtos/unshare-skill.input';
import { UpdateSkillInput } from 'src/engine/metadata-modules/skill/dtos/update-skill.input';
import { SkillGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/skill/interceptors/skill-graphql-api-exception.interceptor';
import { SkillService } from 'src/engine/metadata-modules/skill/skill.service';
import { WorkspaceMigrationGraphqlApiExceptionInterceptor } from 'src/engine/workspace-manager/workspace-migration/interceptors/workspace-migration-graphql-api-exception.interceptor';

// Reads are open to chat users so the composer can list skills; mutations
// enforce ownership / AI_SETTINGS inside SkillService.
@UseGuards(WorkspaceAuthGuard)
@UseInterceptors(
  WorkspaceMigrationGraphqlApiExceptionInterceptor,
  SkillGraphqlApiExceptionInterceptor,
)
@MetadataResolver(() => SkillDTO)
export class SkillResolver {
  constructor(private readonly skillService: SkillService) {}

  @Query(() => [SkillDTO])
  async skills(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO[]> {
    return this.skillService.findAllVisible({
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Query(() => SkillDTO, { nullable: true })
  async skill(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO | null> {
    return this.skillService.findVisibleById(id, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillDTO)
  async createSkill(
    @Args('input') input: CreateSkillInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO> {
    return this.skillService.create(input, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillDTO)
  async updateSkill(
    @Args('input') input: UpdateSkillInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO> {
    return this.skillService.update(input, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillDTO)
  async deleteSkill(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO> {
    return this.skillService.delete(id, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillDTO)
  async activateSkill(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO> {
    return this.skillService.activate(id, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillDTO)
  async deactivateSkill(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillDTO> {
    return this.skillService.deactivate(id, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => SkillShareDTO)
  async shareSkill(
    @Args('input') input: ShareSkillInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillShareDTO> {
    return this.skillService.shareSkill(input, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => Boolean)
  async unshareSkill(
    @Args('input') input: UnshareSkillInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<boolean> {
    return this.skillService.unshareSkill(input, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Query(() => [SkillShareDTO])
  async skillShares(
    @Args('skillId', { type: () => UUIDScalarType }) skillId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<SkillShareDTO[]> {
    return this.skillService.listSkillShares(skillId, {
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }
}

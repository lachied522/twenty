import { Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { ToolCategory } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { CREATE_SKILL_TOOL_NAME } from 'src/engine/core-modules/tool-provider/tools/skill/create-skill.tool';
import { LIST_MY_SKILLS_TOOL_NAME } from 'src/engine/core-modules/tool-provider/tools/skill/list-my-skills.tool';
import { SHARE_SKILL_TOOL_NAME } from 'src/engine/core-modules/tool-provider/tools/skill/share-skill.tool';
import { SkillToolWorkspaceService } from 'src/engine/core-modules/tool-provider/tools/skill/skill-tool.workspace-service';
import { UNSHARE_SKILL_TOOL_NAME } from 'src/engine/core-modules/tool-provider/tools/skill/unshare-skill.tool';
import { UPDATE_SKILL_TOOL_NAME } from 'src/engine/core-modules/tool-provider/tools/skill/update-skill.tool';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { executeToolFromToolSet } from 'src/engine/core-modules/tool-provider/utils/execute-tool-from-tool-set.util';
import { toolSetToDescriptors } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';

export const SKILL_META_TOOL_NAMES = [
  CREATE_SKILL_TOOL_NAME,
  UPDATE_SKILL_TOOL_NAME,
  SHARE_SKILL_TOOL_NAME,
  UNSHARE_SKILL_TOOL_NAME,
  LIST_MY_SKILLS_TOOL_NAME,
] as const;

@Injectable()
export class SkillToolProvider implements ToolProvider {
  readonly category = ToolCategory.SKILL;

  constructor(
    private readonly skillToolWorkspaceService: SkillToolWorkspaceService,
  ) {}

  async isAvailable(context: ToolProviderContext): Promise<boolean> {
    return isDefined(context.userWorkspaceId);
  }

  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    return toolSetToDescriptors(this.buildToolSet(context), ToolCategory.SKILL, {
      includeSchemas: options?.includeSchemas ?? true,
    });
  }

  async executeStaticTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    return executeToolFromToolSet(
      this.buildToolSet(context),
      toolName,
      args,
      ToolCategory.SKILL,
    );
  }

  private buildToolSet(context: ToolProviderContext): ToolSet {
    if (!isDefined(context.userWorkspaceId)) {
      return {};
    }

    return this.skillToolWorkspaceService.generateSkillTools({
      workspaceId: context.workspaceId,
      userWorkspaceId: context.userWorkspaceId,
      roleId: context.roleId,
    });
  }
}

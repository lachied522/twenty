import { Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { isDefined } from 'twenty-shared/utils';

import { createCreateSkillTool } from 'src/engine/core-modules/tool-provider/tools/skill/create-skill.tool';
import { createListMySkillsTool } from 'src/engine/core-modules/tool-provider/tools/skill/list-my-skills.tool';
import { createShareSkillTool } from 'src/engine/core-modules/tool-provider/tools/skill/share-skill.tool';
import { createUnshareSkillTool } from 'src/engine/core-modules/tool-provider/tools/skill/unshare-skill.tool';
import { createUpdateSkillTool } from 'src/engine/core-modules/tool-provider/tools/skill/update-skill.tool';
import { SkillService } from 'src/engine/metadata-modules/skill/skill.service';

@Injectable()
export class SkillToolWorkspaceService {
  constructor(private readonly skillService: SkillService) {}

  generateSkillTools({
    workspaceId,
    userWorkspaceId,
    roleId,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
    roleId?: string;
  }): ToolSet {
    const createSkill = createCreateSkillTool({
      skillService: this.skillService,
      workspaceId,
      userWorkspaceId,
    });
    const updateSkill = createUpdateSkillTool({
      skillService: this.skillService,
      workspaceId,
      userWorkspaceId,
    });
    const shareSkill = createShareSkillTool({
      skillService: this.skillService,
      workspaceId,
      userWorkspaceId,
    });
    const unshareSkill = createUnshareSkillTool({
      skillService: this.skillService,
      workspaceId,
      userWorkspaceId,
    });
    const listMySkills = createListMySkillsTool({
      skillService: this.skillService,
      workspaceId,
      userWorkspaceId,
      roleId,
    });

    return {
      [createSkill.name]: createSkill,
      [updateSkill.name]: updateSkill,
      [shareSkill.name]: shareSkill,
      [unshareSkill.name]: unshareSkill,
      [listMySkills.name]: listMySkills,
    };
  }

  isReady(userWorkspaceId: string | undefined): userWorkspaceId is string {
    return isDefined(userWorkspaceId);
  }
}

import { COMMON_PRELOAD_TOOLS } from 'src/engine/core-modules/tool-provider/constants/common-preload-tools.const';
import { COMPOSIO_META_TOOL_NAMES } from 'src/engine/core-modules/tool-provider/providers/composio-tool.provider';
import { SKILL_META_TOOL_NAMES } from 'src/engine/core-modules/tool-provider/providers/skill-tool.provider';

export const AI_CHAT_TOOL_NAMES_TO_PRELOAD: string[] = [
  ...COMMON_PRELOAD_TOOLS,
  'app_exa_web_search',
  ...COMPOSIO_META_TOOL_NAMES,
  ...SKILL_META_TOOL_NAMES,
];

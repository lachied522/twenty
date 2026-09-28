import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';

import { type ToolDisplayContext } from '@/ai/types/tool-display-context.type';
import { type ToolInput } from '@/ai/types/ToolInput';
import { buildNamedItemsStatusMessage } from '@/ai/utils/tool-display/build-named-items-status-message.util';
import { buildToolStatusMessageByCategory } from '@/ai/utils/tool-display/build-tool-status-message-by-category.util';
import { extractSearchQuery } from '@/ai/utils/tool-display/extract-search-query.util';
import { pickStatusLabel } from '@/ai/utils/tool-display/pick-status-label.util';
import { unwrapToolInput } from '@/ai/utils/tool-display/unwrap-tool-input.util';

const ModelGeneratedLabelSchema = z.object({
  loadingMessage: z.string(),
  completedMessage: z.string().optional(),
});
const LearnToolsSchema = z.object({ toolNames: z.array(z.string()) });
const LoadSkillsSchema = z.object({ skillNames: z.array(z.string()) });

export const getToolDisplayMessage = ({
  input,
  toolName,
  isFinished,
  displayContext,
  output,
}: {
  input: ToolInput;
  toolName: string;
  isFinished: boolean;
  displayContext: ToolDisplayContext;
  output?: unknown;
}): string => {
  const { toolInput, toolName: resolvedToolName } = unwrapToolInput({
    input,
    toolName,
  });

  return buildToolDisplayMessage({
    input: toolInput,
    toolName: resolvedToolName,
    isFinished,
    displayContext,
    output,
  });
};

const buildToolDisplayMessage = ({
  input,
  toolName,
  isFinished,
  displayContext,
  output,
}: {
  input: ToolInput;
  toolName: string;
  isFinished: boolean;
  displayContext: ToolDisplayContext;
  output?: unknown;
}): string => {
  switch (toolName) {
    case 'web_search':
    case 'app_exa_web_search': {
      const query = extractSearchQuery(input);

      if (isNonEmptyString(query)) {
        return pickStatusLabel({
          isFinished,
          completedLabel: t`Searched the web for ${query}`,
          loadingLabel: t`Searching the web for ${query}`,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Searched the web`,
        loadingLabel: t`Searching the web`,
      });
    }
    case 'learn_tools': {
      const parsed = LearnToolsSchema.safeParse(input);

      return buildNamedItemsStatusMessage({
        names: parsed.success ? parsed.data.toolNames : [],
        isFinished,
        displayContext,
        output,
        loadingLabel: (formattedNames) => t`Learning ${formattedNames}`,
        completedLabel: (formattedNames) => t`Learned ${formattedNames}`,
        loadingFallback: t`Learning tools...`,
        completedFallback: t`Learned tools`,
      });
    }
    case 'load_skills': {
      const parsed = LoadSkillsSchema.safeParse(input);

      return buildNamedItemsStatusMessage({
        names: parsed.success ? parsed.data.skillNames : [],
        isFinished,
        displayContext,
        output,
        loadingLabel: (formattedNames) => t`Loading ${formattedNames}`,
        completedLabel: (formattedNames) => t`Loaded ${formattedNames}`,
        loadingFallback: t`Loading skills...`,
        completedFallback: t`Loaded skills`,
      });
    }
    case 'code_interpreter': {
      const parsed = ModelGeneratedLabelSchema.safeParse(input);

      if (parsed.success && isNonEmptyString(parsed.data.loadingMessage)) {
        const completedMessage = isNonEmptyString(parsed.data.completedMessage)
          ? parsed.data.completedMessage
          : parsed.data.loadingMessage;

        return pickStatusLabel({
          isFinished,
          completedLabel: completedMessage,
          loadingLabel: parsed.data.loadingMessage,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Ran code`,
        loadingLabel: t`Running code`,
      });
    }
    case 'composio_search_tools': {
      const query =
        typeof input === 'object' &&
        input !== null &&
        'query' in input &&
        typeof input.query === 'string'
          ? input.query
          : '';

      if (isNonEmptyString(query)) {
        return pickStatusLabel({
          isFinished,
          completedLabel: t`Searched integrations for ${query}`,
          loadingLabel: t`Searching integrations for ${query}`,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Searched integrations`,
        loadingLabel: t`Searching integrations`,
      });
    }
    case 'composio_get_tool_schemas': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Loaded integration schemas`,
        loadingLabel: t`Loading integration schemas`,
      });
    }
    case 'composio_execute_tool': {
      const toolSlug =
        typeof input === 'object' &&
        input !== null &&
        'toolSlug' in input &&
        typeof input.toolSlug === 'string'
          ? input.toolSlug
          : '';

      if (isNonEmptyString(toolSlug)) {
        return pickStatusLabel({
          isFinished,
          completedLabel: t`Ran ${toolSlug}`,
          loadingLabel: t`Running ${toolSlug}`,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Ran integration tool`,
        loadingLabel: t`Running integration tool`,
      });
    }
    case 'composio_manage_connections': {
      const toolkits =
        typeof input === 'object' &&
        input !== null &&
        'toolkits' in input &&
        Array.isArray(input.toolkits)
          ? input.toolkits.filter(
              (toolkit): toolkit is string => typeof toolkit === 'string',
            )
          : [];

      if (toolkits.length > 0) {
        const label = toolkits.join(', ');

        return pickStatusLabel({
          isFinished,
          completedLabel: t`Managed ${label} connection`,
          loadingLabel: t`Connecting ${label}`,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Managed integration connection`,
        loadingLabel: t`Connecting integration`,
      });
    }
    case 'composio_wait_for_connections': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Finished connecting integration`,
        loadingLabel: t`Waiting for integration connection`,
      });
    }
    case 'create_skill': {
      const label =
        typeof input === 'object' &&
        input !== null &&
        'label' in input &&
        typeof input.label === 'string'
          ? input.label
          : '';

      if (isNonEmptyString(label)) {
        return pickStatusLabel({
          isFinished,
          completedLabel: t`Saved skill ${label}`,
          loadingLabel: t`Saving skill ${label}`,
        });
      }

      return pickStatusLabel({
        isFinished,
        completedLabel: t`Saved skill`,
        loadingLabel: t`Saving skill`,
      });
    }
    case 'update_skill': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Updated skill`,
        loadingLabel: t`Updating skill`,
      });
    }
    case 'share_skill': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Shared skill`,
        loadingLabel: t`Sharing skill`,
      });
    }
    case 'unshare_skill': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Removed skill share`,
        loadingLabel: t`Removing skill share`,
      });
    }
    case 'list_my_skills': {
      return pickStatusLabel({
        isFinished,
        completedLabel: t`Listed skills`,
        loadingLabel: t`Listing skills`,
      });
    }
    default:
      return buildToolStatusMessageByCategory({
        toolName,
        isFinished,
        displayContext,
      });
  }
};

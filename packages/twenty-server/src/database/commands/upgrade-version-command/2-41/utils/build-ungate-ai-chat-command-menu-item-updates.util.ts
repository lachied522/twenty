import { isDefined } from 'twenty-shared/utils';

import { type FlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/types/flat-command-menu-item.type';
import { STANDARD_COMMAND_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant';

const GATED_ASK_AI_EXPRESSIONS = new Set([
  'permissionFlags.AI',
  'permissionFlags.AI and not isInSidePanel',
]);

const GATED_VIEW_PREVIOUS_AI_CHATS_EXPRESSION = 'permissionFlags.AI';

export const buildUngateAiChatCommandMenuItemUpdates = ({
  existingAskAiCommandMenuItem,
  existingViewPreviousAiChatsCommandMenuItem,
  now,
}: {
  existingAskAiCommandMenuItem: FlatCommandMenuItem | undefined;
  existingViewPreviousAiChatsCommandMenuItem: FlatCommandMenuItem | undefined;
  now: string;
}): FlatCommandMenuItem[] => {
  const itemsToUpdate: FlatCommandMenuItem[] = [];

  if (
    isDefined(existingAskAiCommandMenuItem) &&
    GATED_ASK_AI_EXPRESSIONS.has(
      existingAskAiCommandMenuItem.conditionalAvailabilityExpression ?? '',
    ) &&
    existingAskAiCommandMenuItem.conditionalAvailabilityExpression !==
      STANDARD_COMMAND_MENU_ITEMS.askAi.conditionalAvailabilityExpression
  ) {
    itemsToUpdate.push({
      ...existingAskAiCommandMenuItem,
      conditionalAvailabilityExpression:
        STANDARD_COMMAND_MENU_ITEMS.askAi.conditionalAvailabilityExpression,
      updatedAt: now,
    });
  }

  if (
    isDefined(existingViewPreviousAiChatsCommandMenuItem) &&
    existingViewPreviousAiChatsCommandMenuItem.conditionalAvailabilityExpression ===
      GATED_VIEW_PREVIOUS_AI_CHATS_EXPRESSION &&
    existingViewPreviousAiChatsCommandMenuItem.conditionalAvailabilityExpression !==
      STANDARD_COMMAND_MENU_ITEMS.viewPreviousAiChats
        .conditionalAvailabilityExpression
  ) {
    itemsToUpdate.push({
      ...existingViewPreviousAiChatsCommandMenuItem,
      conditionalAvailabilityExpression:
        STANDARD_COMMAND_MENU_ITEMS.viewPreviousAiChats
          .conditionalAvailabilityExpression,
      updatedAt: now,
    });
  }

  return itemsToUpdate;
};

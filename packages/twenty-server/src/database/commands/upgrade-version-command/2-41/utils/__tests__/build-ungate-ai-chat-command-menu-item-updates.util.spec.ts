import { buildUngateAiChatCommandMenuItemUpdates } from 'src/database/commands/upgrade-version-command/2-41/utils/build-ungate-ai-chat-command-menu-item-updates.util';
import { type FlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/types/flat-command-menu-item.type';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { STANDARD_COMMAND_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant';
import { createStandardCommandMenuItemFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/command-menu-item/create-standard-command-menu-item-flat-metadata.util';

const NOW = '2026-09-20T04:00:00.000Z';

const createCommandMenuItem = (
  commandMenuItemName: 'askAi' | 'viewPreviousAiChats',
  commandMenuItemId: string,
): FlatCommandMenuItem =>
  createStandardCommandMenuItemFlatMetadata({
    commandMenuItemName,
    commandMenuItemId,
    workspaceId: 'workspace-id',
    twentyStandardApplicationId: 'application-id',
    dependencyFlatEntityMaps: {
      flatObjectMetadataMaps: createEmptyFlatEntityMaps(),
    },
    now: '2026-08-01T00:00:00.000Z',
  });

const ASK_AI_COMMAND_MENU_ITEM = Object.freeze(
  createCommandMenuItem('askAi', 'ask-ai-command-id'),
);
const VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM = Object.freeze(
  createCommandMenuItem(
    'viewPreviousAiChats',
    'view-previous-ai-chats-command-id',
  ),
);

describe('buildUngateAiChatCommandMenuItemUpdates', () => {
  it('drops the Ask AI permission flag from both chat commands', () => {
    expect(
      buildUngateAiChatCommandMenuItemUpdates({
        existingAskAiCommandMenuItem: {
          ...ASK_AI_COMMAND_MENU_ITEM,
          conditionalAvailabilityExpression:
            'permissionFlags.AI and not isInSidePanel',
        },
        existingViewPreviousAiChatsCommandMenuItem: {
          ...VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM,
          conditionalAvailabilityExpression: 'permissionFlags.AI',
        },
        now: NOW,
      }),
    ).toEqual([
      {
        ...ASK_AI_COMMAND_MENU_ITEM,
        conditionalAvailabilityExpression:
          STANDARD_COMMAND_MENU_ITEMS.askAi.conditionalAvailabilityExpression,
        updatedAt: NOW,
      },
      {
        ...VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM,
        conditionalAvailabilityExpression:
          STANDARD_COMMAND_MENU_ITEMS.viewPreviousAiChats
            .conditionalAvailabilityExpression,
        updatedAt: NOW,
      },
    ]);
  });

  it('also ungates the pre-2.38 Ask AI expression', () => {
    expect(
      buildUngateAiChatCommandMenuItemUpdates({
        existingAskAiCommandMenuItem: {
          ...ASK_AI_COMMAND_MENU_ITEM,
          conditionalAvailabilityExpression: 'permissionFlags.AI',
        },
        existingViewPreviousAiChatsCommandMenuItem:
          VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM,
        now: NOW,
      }),
    ).toEqual([
      {
        ...ASK_AI_COMMAND_MENU_ITEM,
        conditionalAvailabilityExpression:
          STANDARD_COMMAND_MENU_ITEMS.askAi.conditionalAvailabilityExpression,
        updatedAt: NOW,
      },
    ]);
  });

  it('keeps the migrated expressions synchronized with the standard definition', () => {
    expect(
      STANDARD_COMMAND_MENU_ITEMS.askAi.conditionalAvailabilityExpression,
    ).toBe('not isInSidePanel');
    expect(
      STANDARD_COMMAND_MENU_ITEMS.viewPreviousAiChats
        .conditionalAvailabilityExpression,
    ).toBeNull();
  });

  it.each([
    {
      name: 'missing commands',
      existingAskAiCommandMenuItem: undefined,
      existingViewPreviousAiChatsCommandMenuItem: undefined,
    },
    {
      name: 'custom availability expressions',
      existingAskAiCommandMenuItem: {
        ...ASK_AI_COMMAND_MENU_ITEM,
        conditionalAvailabilityExpression:
          'permissionFlags.AI and objectPermissions.canReadObjectRecords',
      },
      existingViewPreviousAiChatsCommandMenuItem: {
        ...VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM,
        conditionalAvailabilityExpression: 'pageType == "INDEX_PAGE"',
      },
    },
    {
      name: 'already migrated commands',
      existingAskAiCommandMenuItem: ASK_AI_COMMAND_MENU_ITEM,
      existingViewPreviousAiChatsCommandMenuItem:
        VIEW_PREVIOUS_AI_CHATS_COMMAND_MENU_ITEM,
    },
  ])(
    'skips $name',
    ({
      existingAskAiCommandMenuItem,
      existingViewPreviousAiChatsCommandMenuItem,
    }) => {
      expect(
        buildUngateAiChatCommandMenuItemUpdates({
          existingAskAiCommandMenuItem,
          existingViewPreviousAiChatsCommandMenuItem,
          now: NOW,
        }),
      ).toEqual([]);
    },
  );
});

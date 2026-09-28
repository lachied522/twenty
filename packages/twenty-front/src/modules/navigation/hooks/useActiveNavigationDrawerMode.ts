import { useLocation } from 'react-router-dom';

import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { navigationDrawerActiveTabState } from '@/ui/navigation/states/navigationDrawerActiveTabState';
import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isAiChatPath } from '~/utils/isAiChatPath';
import { isFilesPath } from '~/utils/isFilesPath';
import { isIntegrationsPath } from '~/utils/isIntegrationsPath';
import { isSkillsPath } from '~/utils/isSkillsPath';
import { isWorkflowRelatedPath } from '~/utils/isWorkflowRelatedPath';

// Settings and Files own a full page each, so the route decides those two
// modes. Chat also owns a page, but the stored tab still has a say when the
// chat history is listed beside another page. Work is everything left over.
export const useActiveNavigationDrawerMode = (): NavigationDrawerActiveTab => {
  const { pathname } = useLocation();
  const isSettingsDrawer = useIsSettingsDrawer();
  const navigationDrawerActiveTab = useAtomStateValue(
    navigationDrawerActiveTabState,
  );

  if (isSettingsDrawer) {
    return NAVIGATION_DRAWER_TABS.SETTINGS;
  }

  if (isFilesPath(pathname)) {
    return NAVIGATION_DRAWER_TABS.FILES;
  }

  if (
    isAiChatPath(pathname) ||
    isIntegrationsPath(pathname) ||
    isSkillsPath(pathname) ||
    isWorkflowRelatedPath(pathname) ||
    navigationDrawerActiveTab === NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY
  ) {
    return NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY;
  }

  return NAVIGATION_DRAWER_TABS.NAVIGATION_MENU;
};

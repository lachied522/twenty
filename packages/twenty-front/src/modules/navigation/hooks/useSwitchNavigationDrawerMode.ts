import { useLocation, useNavigate } from 'react-router-dom';
import { AppPath, SettingsPath } from 'twenty-shared/types';

import { useReturnFromExpandedAiChat } from '@/ai/hooks/useReturnFromExpandedAiChat';
import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { getExpandedAiChatReturnLocation } from '@/ai/utils/getExpandedAiChatReturnLocation';
import { useActiveNavigationDrawerMode } from '@/navigation/hooks/useActiveNavigationDrawerMode';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { currentMobileNavigationDrawerState } from '@/navigation/states/currentMobileNavigationDrawerState';
import { getNavigationDrawerHomeDestination } from '@/navigation/utils/getNavigationDrawerHomeDestination';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { navigationDrawerActiveTabState } from '@/ui/navigation/states/navigationDrawerActiveTabState';
import { navigationDrawerExpandedMemorizedState } from '@/ui/navigation/states/navigationDrawerExpandedMemorizedState';
import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { navigationMemorizedUrlState } from '@/ui/navigation/states/navigationMemorizedUrlState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import { isAiChatPath } from '~/utils/isAiChatPath';
import { isFilesPath } from '~/utils/isFilesPath';
import { isIntegrationsPath } from '~/utils/isIntegrationsPath';
import { isSkillsPath } from '~/utils/isSkillsPath';
import { isWorkflowRelatedPath } from '~/utils/isWorkflowRelatedPath';

export const useSwitchNavigationDrawerMode = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateSettings = useNavigateSettings();

  const activeNavigationDrawerMode = useActiveNavigationDrawerMode();
  const isSettingsDrawer = useIsSettingsDrawer();
  const isSettingsPage = useIsSettingsPage();
  const isAiChatPage = isAiChatPath(location.pathname);
  const isFilesPage = isFilesPath(location.pathname);
  const isIntegrationsPage = isIntegrationsPath(location.pathname);
  const isSkillsPage = isSkillsPath(location.pathname);
  const isWorkflowsPage = isWorkflowRelatedPath(location.pathname);

  const navigationMemorizedUrl = useAtomStateValue(navigationMemorizedUrlState);
  const navigationDrawerExpandedMemorized = useAtomStateValue(
    navigationDrawerExpandedMemorizedState,
  );
  const setIsNavigationDrawerExpanded = useSetAtomState(
    isNavigationDrawerExpandedState,
  );
  const setCurrentMobileNavigationDrawer = useSetAtomState(
    currentMobileNavigationDrawerState,
  );
  const setNavigationDrawerActiveTab = useSetAtomState(
    navigationDrawerActiveTabState,
  );
  const setNavigationMemorizedUrl = useSetAtomState(
    navigationMemorizedUrlState,
  );

  const { defaultHomePagePath } = useDefaultHomePagePath();
  const { switchToNewChat } = useSwitchToNewAiChat({
    shouldOpenInFullPage: true,
  });
  const workDestinationPath = getNavigationDrawerHomeDestination({
    memorizedUrl: navigationMemorizedUrl,
    defaultHomePagePath,
  });
  const returnFromExpandedAiChat = useReturnFromExpandedAiChat({
    reopenSidePanel: false,
    destinationPath: getNavigationDrawerHomeDestination({
      memorizedUrl: getExpandedAiChatReturnLocation(location.state),
      defaultHomePagePath,
    }),
  });

  const restoreMainDrawerAfterSettings = () => {
    setCurrentMobileNavigationDrawer('main');
    setIsNavigationDrawerExpanded(navigationDrawerExpandedMemorized);
  };

  const switchToNavigationMenu = () => {
    setNavigationDrawerActiveTab(NAVIGATION_DRAWER_TABS.NAVIGATION_MENU);

    if (isSettingsDrawer) {
      restoreMainDrawerAfterSettings();
      navigate(workDestinationPath, { replace: true });
      return;
    }

    if (isFilesPage) {
      navigate(workDestinationPath, { replace: true });
      return;
    }

    if (isIntegrationsPage) {
      navigate(workDestinationPath, { replace: true });
      return;
    }

    if (isSkillsPage) {
      navigate(workDestinationPath, { replace: true });
      return;
    }

    if (isWorkflowsPage) {
      navigate(workDestinationPath, { replace: true });
      return;
    }

    if (isAiChatPage) {
      returnFromExpandedAiChat();
    }
  };

  const switchToAiChat = () => {
    setCurrentMobileNavigationDrawer('main');
    setNavigationDrawerActiveTab(NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY);
    switchToNewChat();
  };

  const switchToFiles = () => {
    if (isSettingsDrawer) {
      restoreMainDrawerAfterSettings();
    }

    setNavigationDrawerActiveTab(NAVIGATION_DRAWER_TABS.FILES);

    if (isFilesPage) {
      return;
    }

    setNavigationMemorizedUrl(location.pathname + location.search);
    navigate(AppPath.Files);
  };

  // The AI mode also covers the chat history listed next to another page, so it
  // is the chat page rather than the active mode that makes a click a no-op.
  const switchNavigationDrawerMode = (mode: NavigationDrawerActiveTab) => {
    switch (mode) {
      case NAVIGATION_DRAWER_TABS.NAVIGATION_MENU:
        if (
          activeNavigationDrawerMode === NAVIGATION_DRAWER_TABS.NAVIGATION_MENU
        ) {
          return;
        }
        switchToNavigationMenu();
        break;
      case NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY:
        if (isAiChatPage) {
          return;
        }
        switchToAiChat();
        break;
      case NAVIGATION_DRAWER_TABS.FILES:
        if (isFilesPage) {
          return;
        }
        switchToFiles();
        break;
      case NAVIGATION_DRAWER_TABS.SETTINGS:
        // The mobile settings drawer outlives the route that opened it, a
        // browser back out of settings for one, so the page rather than the
        // drawer says whether there is anywhere left to go. Desktop has no
        // such split: there the two are the same thing.
        if (isSettingsPage) {
          return;
        }
        navigateSettings(SettingsPath.ProfilePage);
        break;
    }
  };

  return { switchNavigationDrawerMode };
};

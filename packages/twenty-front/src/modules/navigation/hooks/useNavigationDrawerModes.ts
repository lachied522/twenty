import { useLingui } from '@lingui/react/macro';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import {
  type IconComponent,
  IconBriefcase,
  IconFiles,
  IconHome,
  IconSettings,
} from 'twenty-ui/icon';

import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { useIsWorkspaceActivationStatusEqualsTo } from '@/workspace/hooks/useIsWorkspaceActivationStatusEqualsTo';

export type NavigationDrawerMode = {
  Icon: IconComponent;
  label: string;
  mode: NavigationDrawerActiveTab;
};

export const useNavigationDrawerModes = (): NavigationDrawerMode[] => {
  const { t } = useLingui();

  const isWorkspaceSuspended = useIsWorkspaceActivationStatusEqualsTo(
    WorkspaceActivationStatus.SUSPENDED,
  );

  // A suspended workspace is held on the billing settings by the route guard,
  // so offering the modes it would bounce back from only flashes the user out
  // and in again.
  if (isWorkspaceSuspended) {
    return [];
  }

  return [
    {
      Icon: IconHome,
      label: t`Home`,
      mode: NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY,
    },
    {
      Icon: IconBriefcase,
      label: t`Work`,
      mode: NAVIGATION_DRAWER_TABS.NAVIGATION_MENU,
    },
    {
      Icon: IconFiles,
      label: t`Files`,
      mode: NAVIGATION_DRAWER_TABS.FILES,
    },
    {
      Icon: IconSettings,
      label: t`Settings`,
      mode: NAVIGATION_DRAWER_TABS.SETTINGS,
    },
  ];
};

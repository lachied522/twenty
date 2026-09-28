import { FilesNavigationDrawerContent } from '@/drive/components/FilesNavigationDrawerContent';
import { MainNavigationDrawerNavigationContent } from '@/navigation/components/MainNavigationDrawerNavigationContent';
import { NavigationDrawerTabbedContent } from '@/navigation/components/NavigationDrawerTabbedContent';
import { useActiveNavigationDrawerMode } from '@/navigation/hooks/useActiveNavigationDrawerMode';
import { useIsNavigationDrawerContentExpanded } from '@/navigation/hooks/useIsNavigationDrawerContentExpanded';
import { NavigationDrawerScrollableContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerScrollableContent';
import { NAVIGATION_DRAWER_TABS } from '@/ui/navigation/states/navigationDrawerTabs';

export const MainNavigationDrawerContent = () => {
  const activeNavigationDrawerMode = useActiveNavigationDrawerMode();
  const isExpanded = useIsNavigationDrawerContentExpanded();

  // Chat threads carry no icon of their own, so the icon rail would list them
  // as a column of identical bubbles. The navigation items stay useful there.
  const showAiChatContent =
    isExpanded &&
    activeNavigationDrawerMode === NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY;
  const showFilesContent =
    activeNavigationDrawerMode === NAVIGATION_DRAWER_TABS.FILES;

  return (
    <NavigationDrawerScrollableContent>
      <NavigationDrawerTabbedContent
        showAiChatContent={showAiChatContent}
        shouldMountAiChatContent={true}
        showFilesContent={showFilesContent}
        filesContent={<FilesNavigationDrawerContent />}
        navigationContent={<MainNavigationDrawerNavigationContent />}
      />
    </NavigationDrawerScrollableContent>
  );
};

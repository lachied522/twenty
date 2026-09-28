export const NAVIGATION_DRAWER_TABS = {
  NAVIGATION_MENU: 'home',
  AI_CHAT_HISTORY: 'chat',
  FILES: 'files',
  SETTINGS: 'settings',
} as const;

export type NavigationDrawerActiveTab =
  (typeof NAVIGATION_DRAWER_TABS)[keyof typeof NAVIGATION_DRAWER_TABS];

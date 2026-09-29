import { isAiChatPath } from '~/utils/isAiChatPath';

export const getActiveAiChatNavigationThreadId = ({
  currentAiChatThread,
  pathname,
}: {
  currentAiChatThread: string | null;
  pathname: string;
}) => (isAiChatPath(pathname) ? currentAiChatThread : null);

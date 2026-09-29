import { useEffect } from 'react';

import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';

// Leaving the chat page shouldn't leave the panel open for the next visit
export const AiChatFilesPanelCloseOnUnmountEffect = () => {
  const { closeChatFilesPanel } = useAiChatFilesPanel();

  useEffect(() => closeChatFilesPanel, [closeChatFilesPanel]);

  return null;
};

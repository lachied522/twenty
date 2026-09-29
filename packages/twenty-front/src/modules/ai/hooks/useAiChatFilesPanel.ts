import { useStore } from 'jotai';
import { useCallback } from 'react';

import { aiChatFilesPanelState } from '@/ai/states/aiChatFilesPanelState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';

export const useAiChatFilesPanel = () => {
  const store = useStore();

  // A null selectedFileId opens the overview
  const openChatFilesPanel = useCallback(
    (selectedFileId: string | null) => {
      store.set(aiChatFilesPanelState.atom, {
        threadId: store.get(currentAiChatThreadState.atom),
        selectedFileId,
      });
    },
    [store],
  );

  const closeChatFilesPanel = useCallback(() => {
    store.set(aiChatFilesPanelState.atom, null);
  }, [store]);

  return { openChatFilesPanel, closeChatFilesPanel };
};

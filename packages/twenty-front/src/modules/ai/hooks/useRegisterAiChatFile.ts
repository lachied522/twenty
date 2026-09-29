import { useStore } from 'jotai';
import { useCallback } from 'react';

import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { aiChatFilesState } from '@/ai/states/aiChatFilesState';
import { type AiChatFile } from '@/ai/types/AiChatFile';

export const useRegisterAiChatFile = () => {
  const store = useStore();
  const { openChatFilesPanel } = useAiChatFilesPanel();

  const registerChatFile = useCallback(
    (
      file: AiChatFile,
      { shouldOpenPreview }: { shouldOpenPreview: boolean },
    ) => {
      store.set(aiChatFilesState.atom, (files) => [
        ...files.filter((existingFile) => existingFile.id !== file.id),
        file,
      ]);

      if (shouldOpenPreview) {
        openChatFilesPanel(file.id);
      }

      // Compare by reference: a remounted message may already have
      // re-registered the same id before this cleanup runs
      return () => {
        store.set(aiChatFilesState.atom, (files) =>
          files.filter((existingFile) => existingFile !== file),
        );
      };
    },
    [store, openChatFilesPanel],
  );

  return { registerChatFile };
};

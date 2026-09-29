import { aiChatFilesPanelState } from '@/ai/states/aiChatFilesPanelState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { aiChatSortedFilesSelector } from '@/ai/states/selectors/aiChatSortedFilesSelector';
import { type AiChatFile } from '@/ai/types/AiChatFile';
import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';
import { isDefined } from 'twenty-shared/utils';

export type AiChatOpenedFilesPanel = {
  files: AiChatFile[];
  selectedFile: AiChatFile | null;
};

// The panel belongs to the thread it was opened on, so switching threads
// closes it without needing a reset hook on every thread-switch path
export const aiChatOpenedFilesPanelSelector =
  createAtomSelector<AiChatOpenedFilesPanel | null>({
    key: 'aiChatOpenedFilesPanelSelector',
    get: ({ get }) => {
      const aiChatFilesPanel = get(aiChatFilesPanelState);
      const files = get(aiChatSortedFilesSelector);

      if (
        !isDefined(aiChatFilesPanel) ||
        aiChatFilesPanel.threadId !== get(currentAiChatThreadState) ||
        files.length === 0
      ) {
        return null;
      }

      return {
        files,
        selectedFile:
          files.find((file) => file.id === aiChatFilesPanel.selectedFileId) ??
          null,
      };
    },
  });

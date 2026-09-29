import { aiChatFilesState } from '@/ai/states/aiChatFilesState';
import { type AiChatFile } from '@/ai/types/AiChatFile';
import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';

// Registration order shifts when messages remount (e.g. the last message
// moving into the settled list), so order by delivery time instead
export const aiChatSortedFilesSelector = createAtomSelector<AiChatFile[]>({
  key: 'aiChatSortedFilesSelector',
  get: ({ get }) =>
    [...get(aiChatFilesState)].sort((fileA, fileB) =>
      fileB.deliveredAt.localeCompare(fileA.deliveredAt),
    ),
});

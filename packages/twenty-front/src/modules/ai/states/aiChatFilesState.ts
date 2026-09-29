import { type AiChatFile } from '@/ai/types/AiChatFile';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const aiChatFilesState = createAtomState<AiChatFile[]>({
  key: 'ai/aiChatFilesState',
  defaultValue: [],
});

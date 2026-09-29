import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type AiChatFilesPanel = {
  threadId: string | null;
  selectedFileId: string | null;
};

export const aiChatFilesPanelState = createAtomState<AiChatFilesPanel | null>({
  key: 'ai/aiChatFilesPanelState',
  defaultValue: null,
});

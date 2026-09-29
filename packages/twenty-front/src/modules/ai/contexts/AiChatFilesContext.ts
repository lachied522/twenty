import { createContext } from 'react';

import { type AiChatFile } from '@/ai/types/AiChatFile';

export type AiChatFilesContextValue = {
  // Returns the matching unregister callback
  registerChatFile: (
    file: AiChatFile,
    options: { shouldOpenPreview: boolean },
  ) => () => void;
  openChatFilePreview: (fileId: string) => void;
};

// Only provided by the full-page chat, so the files panel stays out of the
// Ask AI side panel
export const AiChatFilesContext = createContext<AiChatFilesContextValue | null>(
  null,
);

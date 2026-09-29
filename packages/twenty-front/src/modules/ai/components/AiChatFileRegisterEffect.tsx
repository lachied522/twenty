import { useContext, useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { AiChatFilesContext } from '@/ai/contexts/AiChatFilesContext';
import { type DeliveredFile } from '@/ai/utils/getDeliveredFileFromToolOutput';

type AiChatFileRegisterEffectProps = {
  toolCallId: string;
  deliveredFile: DeliveredFile;
  isStreaming: boolean;
  messageCreatedAt?: string;
};

export const AiChatFileRegisterEffect = ({
  toolCallId,
  deliveredFile,
  isStreaming,
  messageCreatedAt,
}: AiChatFileRegisterEffectProps) => {
  const aiChatFilesContext = useContext(AiChatFilesContext);
  const registerChatFile = aiChatFilesContext?.registerChatFile;
  const { fileId, filename, url, mimeType, sizeBytes } = deliveredFile;

  useEffect(() => {
    if (!isDefined(registerChatFile)) {
      return;
    }

    // Only files delivered during a live stream open the preview, so loading
    // an existing thread doesn't pop the panel open
    return registerChatFile(
      {
        id: toolCallId,
        fileId,
        filename,
        url,
        mimeType,
        sizeBytes,
        deliveredAt: messageCreatedAt ?? new Date().toISOString(),
      },
      { shouldOpenPreview: isStreaming },
    );
  }, [
    registerChatFile,
    toolCallId,
    fileId,
    filename,
    url,
    mimeType,
    sizeBytes,
    messageCreatedAt,
    isStreaming,
  ]);

  return null;
};

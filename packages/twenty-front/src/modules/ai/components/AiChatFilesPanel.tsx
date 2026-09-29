import { isDefined } from 'twenty-shared/utils';
import { useIsMobile } from 'twenty-ui/utilities';

import { AiChatFilesBottomSheet } from '@/ai/components/AiChatFilesBottomSheet';
import { AiChatFilesPanelOverview } from '@/ai/components/AiChatFilesPanelOverview';
import { AiChatFilesPanelPreview } from '@/ai/components/AiChatFilesPanelPreview';
import { AiChatFilesSidePanel } from '@/ai/components/AiChatFilesSidePanel';
import { aiChatOpenedFilesPanelSelector } from '@/ai/states/selectors/aiChatOpenedFilesPanelSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const AiChatFilesPanel = () => {
  const isMobile = useIsMobile();
  const aiChatOpenedFilesPanel = useAtomStateValue(
    aiChatOpenedFilesPanelSelector,
  );

  if (!isDefined(aiChatOpenedFilesPanel)) {
    return null;
  }

  const { files, selectedFile } = aiChatOpenedFilesPanel;

  const panelContent = isDefined(selectedFile) ? (
    <AiChatFilesPanelPreview key={selectedFile.id} file={selectedFile} />
  ) : (
    <AiChatFilesPanelOverview files={files} />
  );

  return isMobile ? (
    <AiChatFilesBottomSheet>{panelContent}</AiChatFilesBottomSheet>
  ) : (
    <AiChatFilesSidePanel>{panelContent}</AiChatFilesSidePanel>
  );
};

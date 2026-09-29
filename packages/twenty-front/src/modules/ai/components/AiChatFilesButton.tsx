import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconFiles } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';

import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { aiChatFilesState } from '@/ai/states/aiChatFilesState';
import { aiChatOpenedFilesPanelSelector } from '@/ai/states/selectors/aiChatOpenedFilesPanelSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const AiChatFilesButton = () => {
  const { t } = useLingui();
  const aiChatFiles = useAtomStateValue(aiChatFilesState);
  const aiChatOpenedFilesPanel = useAtomStateValue(
    aiChatOpenedFilesPanelSelector,
  );
  const { openChatFilesPanel, closeChatFilesPanel } = useAiChatFilesPanel();

  if (aiChatFiles.length === 0) {
    return null;
  }

  const fileCount = aiChatFiles.length;
  const ariaLabel = t`Files (${fileCount})`;

  const handleClick = () => {
    if (isDefined(aiChatOpenedFilesPanel)) {
      closeChatFilesPanel();
      return;
    }

    openChatFilesPanel(null);
  };

  return (
    <IconButton
      Icon={IconFiles}
      size="small"
      variant="secondary"
      ariaLabel={ariaLabel}
      onClick={handleClick}
    />
  );
};

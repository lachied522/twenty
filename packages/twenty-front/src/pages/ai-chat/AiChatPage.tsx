import { styled } from '@linaria/react';
import { useMemo } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { AiChatFilesPanel } from '@/ai/components/AiChatFilesPanel';
import { AiChatFilesPanelCloseOnUnmountEffect } from '@/ai/components/AiChatFilesPanelCloseOnUnmountEffect';
import { AiChatPageCloseAskAiPanelEffect } from '@/ai/components/AiChatPageCloseAskAiPanelEffect';
import { AiChatPageContinueInSidePanelEffect } from '@/ai/components/AiChatPageContinueInSidePanelEffect';
import { AiChatPageHeader } from '@/ai/components/AiChatPageHeader';
import { AiChatPageThreadUrlSyncEffect } from '@/ai/components/AiChatPageThreadUrlSyncEffect';
import { AiChatTab } from '@/ai/components/AiChatTab';
import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import {
  AiChatFilesContext,
  type AiChatFilesContextValue,
} from '@/ai/contexts/AiChatFilesContext';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { useRegisterAiChatFile } from '@/ai/hooks/useRegisterAiChatFile';

const PANEL_CORNER_RADIUS_DERIVED_FROM_THEME_SCALE = `calc(${themeCssVariables.border.radius.md} + ${themeCssVariables.spacing[1]})`;

const StyledPanel = styled.div`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${PANEL_CORNER_RADIUS_DERIVED_FROM_THEME_SCALE} 0 0
    ${PANEL_CORNER_RADIUS_DERIVED_FROM_THEME_SCALE};
  display: flex;
  flex: 1;
  flex-direction: row;
  min-width: 0;
  overflow: hidden;
`;

const StyledChatColumn = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`;

const StyledChatContainer = styled.div`
  --ai-chat-content-max-width: 768px;

  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  width: 100%;
`;

export const AiChatPage = () => {
  const { registerChatFile } = useRegisterAiChatFile();
  const { openChatFilesPanel } = useAiChatFilesPanel();

  const aiChatFilesContextValue = useMemo<AiChatFilesContextValue>(
    () => ({ registerChatFile, openChatFilePreview: openChatFilesPanel }),
    [registerChatFile, openChatFilesPanel],
  );

  return (
    <StyledPanel>
      <AiChatPageThreadUrlSyncEffect />
      <AiChatPageCloseAskAiPanelEffect />
      <AiChatPageContinueInSidePanelEffect />
      <AiChatFilesPanelCloseOnUnmountEffect />
      <StyledChatColumn>
        <AiChatPageHeader />
        <StyledChatContainer>
          <AiChatSurfaceContext.Provider value={AI_CHAT_SURFACE.PAGE}>
            <AiChatFilesContext.Provider value={aiChatFilesContextValue}>
              <AiChatTab />
            </AiChatFilesContext.Provider>
          </AiChatSurfaceContext.Provider>
        </StyledChatContainer>
      </StyledChatColumn>
      <AiChatFilesPanel />
    </StyledPanel>
  );
};

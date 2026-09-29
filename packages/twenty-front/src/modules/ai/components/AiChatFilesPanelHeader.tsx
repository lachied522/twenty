import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowLeft, IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { SIDE_PANEL_TOP_BAR_HEIGHT } from '@/side-panel/constants/SidePanelTopBarHeight';

const StyledHeader = styled.header`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[2]};
  height: ${SIDE_PANEL_TOP_BAR_HEIGHT}px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.div`
  align-items: baseline;
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledTitleText = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSubtitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[1]};
`;

type AiChatFilesPanelHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
};

export const AiChatFilesPanelHeader = ({
  title,
  subtitle,
  onBack,
  actions,
}: AiChatFilesPanelHeaderProps) => {
  const { t } = useLingui();
  const { closeChatFilesPanel } = useAiChatFilesPanel();

  return (
    <StyledHeader>
      {isDefined(onBack) && (
        <IconButton
          Icon={IconArrowLeft}
          size="small"
          variant="tertiary"
          onClick={onBack}
          ariaLabel={t`Back to files`}
        />
      )}
      <StyledTitle>
        <StyledTitleText title={title}>{title}</StyledTitleText>
        {isDefined(subtitle) && <StyledSubtitle>· {subtitle}</StyledSubtitle>}
      </StyledTitle>
      <StyledActions>
        {actions}
        <IconButton
          Icon={IconX}
          size="small"
          variant="tertiary"
          onClick={closeChatFilesPanel}
          ariaLabel={t`Close files`}
        />
      </StyledActions>
    </StyledHeader>
  );
};

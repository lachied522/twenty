import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const APP_ICON_URL = '/images/ai/gizmo-app-icon.png';

const StyledLoadingRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledAppIcon = styled.img`
  display: block;
  flex-shrink: 0;
  height: ${themeCssVariables.spacing[9]};
  image-rendering: pixelated;
  width: ${themeCssVariables.spacing[9]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: ${themeCssVariables.text.lineHeight.lg};
`;

export const AiChatInitialLoadingIndicator = () => {
  const { t } = useLingui();

  return (
    <StyledLoadingRow>
      <StyledAppIcon src={APP_ICON_URL} alt="" />
      <StyledLabel>{t`Working...`}</StyledLabel>
    </StyledLoadingRow>
  );
};

import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Key } from 'ts-key-enum';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';

const StyledBackdrop = styled.div`
  @keyframes aiChatFilesBackdropFadeIn {
    from {
      opacity: 0;
    }
  }

  animation: aiChatFilesBackdropFadeIn
    calc(${themeCssVariables.animation.duration.normal} * 1s) ease-out;
  background: ${themeCssVariables.background.overlaySecondary};
  inset: 0;
  position: fixed;
  z-index: ${RootStackingContextZIndices.RootModalBackDrop};
`;

const StyledSheet = styled.div`
  @keyframes aiChatFilesSheetSlideUp {
    from {
      transform: translateY(100%);
    }
  }

  animation: aiChatFilesSheetSlideUp
    calc(${themeCssVariables.animation.duration.normal} * 1s) ease-out;
  background: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.md}
    ${themeCssVariables.border.radius.md} 0 0;
  bottom: 0;
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  height: 85dvh;
  left: 0;
  outline: none;
  overflow: hidden;
  position: fixed;
  right: 0;
  z-index: ${RootStackingContextZIndices.RootModal};
`;

type AiChatFilesBottomSheetProps = {
  children: ReactNode;
};

export const AiChatFilesBottomSheet = ({
  children,
}: AiChatFilesBottomSheetProps) => {
  const { t } = useLingui();
  const { closeChatFilesPanel } = useAiChatFilesPanel();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === Key.Escape) {
      closeChatFilesPanel();
    }
  };

  return createPortal(
    <>
      <StyledBackdrop onClick={closeChatFilesPanel} />
      <StyledSheet
        role="dialog"
        aria-label={t`Files`}
        aria-modal="true"
        tabIndex={-1}
        autoFocus
        onKeyDown={handleKeyDown}
      >
        {children}
      </StyledSheet>
    </>,
    document.body,
  );
};

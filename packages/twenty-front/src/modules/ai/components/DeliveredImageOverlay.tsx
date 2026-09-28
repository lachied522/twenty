import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Key } from 'ts-key-enum';
import {
  IconCopy,
  IconDownload,
  IconMinus,
  IconPlus,
  IconX,
} from 'twenty-ui/icon';
import { GRAY_SCALE_DARK, GRAY_SCALE_LIGHT } from 'twenty-ui/theme';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { copyImageToClipboard } from '@/activities/files/utils/copyImageToClipboard';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const DEFAULT_ZOOM = 1;

export type DeliveredImageOverlayProps = {
  filename: string;
  url: string;
  onClose: () => void;
};

const StyledOverlay = styled.div`
  align-items: center;
  backdrop-filter: ${themeCssVariables.blur.strong};
  background: ${themeCssVariables.background.overlayPrimary};
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  outline: none;
  overflow: hidden;
  position: fixed;
  right: 0;
  top: 0;
  z-index: ${RootStackingContextZIndices.RootModal};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  left: 0;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[5]};
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 1;
`;

const StyledHeaderGroup = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  pointer-events: auto;
`;

const StyledChromeButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${GRAY_SCALE_LIGHT.gray1};
  cursor: pointer;
  display: inline-flex;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

const StyledActionButton = styled(StyledChromeButton)`
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledImage = styled.img`
  max-height: 80vh;
  max-width: 80vw;
  object-fit: contain;
  transform: scale(var(--image-zoom));
  transform-origin: center center;
  transition: transform calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;
`;

const StyledZoomControls = styled.div`
  align-items: center;
  background: ${GRAY_SCALE_DARK.gray5};
  border-radius: ${themeCssVariables.border.radius.pill};
  bottom: ${themeCssVariables.spacing[6]};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  left: 50%;
  padding: ${themeCssVariables.spacing[1]};
  pointer-events: auto;
  position: absolute;
  transform: translateX(-50%);
  z-index: 1;
`;

const StyledZoomButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${GRAY_SCALE_LIGHT.gray1};
  cursor: pointer;
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

export const DeliveredImageOverlay = ({
  filename,
  url,
  onClose,
}: DeliveredImageOverlayProps) => {
  const { t } = useLingui();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === Key.Escape) {
      onClose();
    }
  };

  const handleZoomOut = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setZoom((currentZoom) => Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP));
  };

  const handleZoomIn = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setZoom((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP));
  };

  const handleDownload = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void downloadFile(url, filename);
  };

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      await copyImageToClipboard(url);
      enqueueSuccessSnackBar({
        message: t`Copied to clipboard`,
      });
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn't copy to clipboard`,
      });
    }
  };

  return createPortal(
    <StyledOverlay
      role="dialog"
      aria-label={t`Image`}
      aria-modal="true"
      tabIndex={-1}
      autoFocus
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <StyledHeader>
        <StyledHeaderGroup>
          <StyledChromeButton
            type="button"
            aria-label={t`Close`}
            onClick={onClose}
          >
            <IconX size={16} />
            {t`Image`}
          </StyledChromeButton>
        </StyledHeaderGroup>
        <StyledHeaderGroup>
          <StyledActionButton type="button" onClick={handleCopy}>
            <IconCopy size={16} />
            {t`Copy`}
          </StyledActionButton>
          <StyledActionButton type="button" onClick={handleDownload}>
            <IconDownload size={16} />
            {t`Download`}
          </StyledActionButton>
        </StyledHeaderGroup>
      </StyledHeader>
      <StyledImage
        src={url}
        alt={filename}
        style={{ '--image-zoom': zoom } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      />
      <StyledZoomControls onClick={(event) => event.stopPropagation()}>
        <StyledZoomButton
          type="button"
          aria-label={t`Zoom out`}
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
        >
          <IconMinus size={16} />
        </StyledZoomButton>
        <StyledZoomButton
          type="button"
          aria-label={t`Zoom in`}
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
        >
          <IconPlus size={16} />
        </StyledZoomButton>
      </StyledZoomControls>
    </StyledOverlay>,
    document.body,
  );
};

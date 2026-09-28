import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type MouseEvent, useState } from 'react';
import { IconDownload } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { downloadFile } from '@/activities/files/utils/downloadFile';
import { DeliveredImageOverlay } from '@/ai/components/DeliveredImageOverlay';
import { isPreviewableImageMimeType } from '@/ai/utils/isPreviewableImageMimeType';
import { formatFileSize } from '@/file/utils/formatFileSize';

export type DeliveredFileCardProps = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
};

const StyledCard = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  margin: ${themeCssVariables.spacing[2]} 0;
  max-width: 420px;
  overflow: hidden;
`;

const StyledPreviewButton = styled.button`
  align-items: center;
  aspect-ratio: 4 / 3;
  background: ${themeCssVariables.background.tertiary};
  border: none;
  cursor: zoom-in;
  display: flex;
  justify-content: center;
  overflow: hidden;
  padding: 0;
`;

const StyledPreviewImage = styled.img`
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  width: 100%;
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledFileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['0.5']};
  min-width: 0;
`;

const StyledStatusLabel = styled.span`
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledFileName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledFileSize = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDownloadButton = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  padding: 0;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

export const DeliveredFileCard = ({
  filename,
  url,
  mimeType,
  sizeBytes,
}: DeliveredFileCardProps) => {
  const { t } = useLingui();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const isImage = isPreviewableImageMimeType(mimeType);

  const handleDownload = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void downloadFile(url, filename);
  };

  return (
    <StyledCard>
      {isImage && (
        <StyledPreviewButton
          type="button"
          aria-label={t`View image`}
          onClick={() => setIsOverlayOpen(true)}
        >
          <StyledPreviewImage src={url} alt={filename} loading="lazy" />
        </StyledPreviewButton>
      )}
      <StyledFooter>
        <StyledFileMeta>
          <StyledStatusLabel>
            {isImage ? t`Image ready` : t`File ready`}
          </StyledStatusLabel>
          <StyledFileName title={filename}>{filename}</StyledFileName>
          {typeof sizeBytes === 'number' && (
            <StyledFileSize>{formatFileSize(sizeBytes)}</StyledFileSize>
          )}
        </StyledFileMeta>
        <StyledDownloadButton type="button" onClick={handleDownload}>
          <IconDownload size={16} />
          {t`Download`}
        </StyledDownloadButton>
      </StyledFooter>
      {isOverlayOpen && isImage && (
        <DeliveredImageOverlay
          filename={filename}
          url={url}
          onClose={() => setIsOverlayOpen(false)}
        />
      )}
    </StyledCard>
  );
};

import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconDownload } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { downloadFile } from '@/activities/files/utils/downloadFile';
import { AiChatFilesPanelHeader } from '@/ai/components/AiChatFilesPanelHeader';
import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { type AiChatFile } from '@/ai/types/AiChatFile';
import { isPdfPreviewSupported } from '@/ai/utils/isPdfPreviewSupported';
import { isPreviewableImageMimeType } from '@/ai/utils/isPreviewableImageMimeType';
import { getFileNameAndExtension } from '~/utils/file/getFileNameAndExtension';

const PDF_MIME_TYPE = 'application/pdf';

const StyledBody = styled.div`
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledPdfFrame = styled.iframe`
  background: ${themeCssVariables.background.tertiary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  flex: 1;
  width: 100%;
`;

const StyledImageContainer = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
`;

const StyledImage = styled.img`
  height: 100%;
  object-fit: contain;
  width: 100%;
`;

const StyledUnsupportedMessage = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.md};
  justify-content: center;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

type AiChatFilesPanelPreviewProps = {
  file: AiChatFile;
};

export const AiChatFilesPanelPreview = ({
  file,
}: AiChatFilesPanelPreviewProps) => {
  const { t } = useLingui();
  const { openChatFilesPanel } = useAiChatFilesPanel();

  const { name, extension } = getFileNameAndExtension(file.filename);
  const fileTypeLabel = isNonEmptyString(extension)
    ? extension.slice(1).toUpperCase()
    : undefined;
  const unsupportedFileType = isNonEmptyString(extension)
    ? extension.toLowerCase()
    : file.mimeType;

  const renderPreview = () => {
    if (file.mimeType === PDF_MIME_TYPE) {
      if (!isPdfPreviewSupported()) {
        return (
          <StyledUnsupportedMessage>
            {t`Your browser doesn't support previews for this file type`}
          </StyledUnsupportedMessage>
        );
      }

      return <StyledPdfFrame src={file.url} title={file.filename} />;
    }

    if (isPreviewableImageMimeType(file.mimeType)) {
      return (
        <StyledImageContainer>
          <StyledImage src={file.url} alt={file.filename} />
        </StyledImageContainer>
      );
    }

    return (
      <StyledUnsupportedMessage>
        {t`Previews for ${unsupportedFileType} are not yet supported`}
      </StyledUnsupportedMessage>
    );
  };

  return (
    <>
      <AiChatFilesPanelHeader
        title={name}
        subtitle={fileTypeLabel}
        onBack={() => openChatFilesPanel(null)}
        actions={
          <IconButton
            Icon={IconDownload}
            size="small"
            variant="tertiary"
            onClick={() => void downloadFile(file.url, file.filename)}
            ariaLabel={t`Download`}
          />
        }
      />
      <StyledBody>{renderPreview()}</StyledBody>
    </>
  );
};

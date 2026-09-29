import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { IconChevronRight } from 'twenty-ui/icon';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

import { getFileType } from '@/activities/files/utils/getFileType';
import { AiChatFilesPanelHeader } from '@/ai/components/AiChatFilesPanelHeader';
import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { type AiChatFile } from '@/ai/types/AiChatFile';
import { IconMapping } from '@/file/utils/fileIconMappings';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatDateTimeString } from '~/utils/string/formatDateTimeString';

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSectionLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

const StyledFileList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledFileRow = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-family: ${themeCssVariables.font.family};
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  transition: background calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease-in-out;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledFileMeta = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['0.5']};
  min-width: 0;
`;

const StyledFileName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledFileDate = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

type AiChatFilesPanelOverviewProps = {
  files: AiChatFile[];
};

export const AiChatFilesPanelOverview = ({
  files,
}: AiChatFilesPanelOverviewProps) => {
  const { t } = useLingui();
  const { theme } = useContext(ThemeContext);
  const { openChatFilesPanel } = useAiChatFilesPanel();
  const { timeZone, dateFormat, timeFormat } = useDateTimeFormat();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  return (
    <>
      <AiChatFilesPanelHeader title={t`Files`} />
      <StyledBody>
        <StyledSectionLabel>{t`Chat files`}</StyledSectionLabel>
        <StyledFileList>
          {files.map((file) => {
            const FileIcon = IconMapping[getFileType(file.filename)];
            const formattedDeliveredAt = formatDateTimeString({
              value: file.deliveredAt,
              timeZone,
              dateFormat,
              timeFormat,
              localeCatalog,
            });

            return (
              <li key={file.id}>
                <StyledFileRow
                  type="button"
                  onClick={() => openChatFilesPanel(file.id)}
                >
                  <FileIcon size={theme.icon.size.lg} />
                  <StyledFileMeta>
                    <StyledFileName title={file.filename}>
                      {file.filename}
                    </StyledFileName>
                    <StyledFileDate>
                      {t`Last modified ${formattedDeliveredAt}`}
                    </StyledFileDate>
                  </StyledFileMeta>
                  <IconChevronRight size={theme.icon.size.md} />
                </StyledFileRow>
              </li>
            );
          })}
        </StyledFileList>
      </StyledBody>
    </>
  );
};

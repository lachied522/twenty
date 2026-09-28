import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
} from 'twenty-ui/feedback';
import { IconPlus, IconUpload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

type DriveEmptyStateProps = {
  canWrite: boolean;
  onUploadClick: () => void;
  onCreateFolderClick: () => void;
};

export const DriveEmptyState = ({
  canWrite,
  onUploadClick,
  onCreateFolderClick,
}: DriveEmptyStateProps) => {
  return (
    <AnimatedPlaceholderEmptyContainer>
      <AnimatedPlaceholder type="noFile" />
      <AnimatedPlaceholderEmptyTextContainer>
        <AnimatedPlaceholderEmptyTitle>
          <Trans>No files</Trans>
        </AnimatedPlaceholderEmptyTitle>
        <AnimatedPlaceholderEmptySubTitle>
          {canWrite ? (
            <Trans>Upload a file or create a folder to get started.</Trans>
          ) : (
            <Trans>This folder is empty.</Trans>
          )}
        </AnimatedPlaceholderEmptySubTitle>
      </AnimatedPlaceholderEmptyTextContainer>
      {canWrite && (
        <StyledActions>
          <Button
            Icon={IconUpload}
            title={t`Upload`}
            variant="secondary"
            onClick={onUploadClick}
          />
          <Button
            Icon={IconPlus}
            title={t`New folder`}
            variant="secondary"
            onClick={onCreateFolderClick}
          />
        </StyledActions>
      )}
    </AnimatedPlaceholderEmptyContainer>
  );
};

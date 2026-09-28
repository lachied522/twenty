import { useDriveActions } from '@/drive/hooks/useDriveActions';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';

export const DRIVE_CREATE_FOLDER_MODAL_ID = 'drive-create-folder-modal';

const StyledCenteredTitle = styled.div`
  text-align: center;
`;

const StyledField = styled.div`
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

type DriveCreateFolderModalProps = {
  currentPath: string;
  onCreated: () => Promise<void>;
};

export const DriveCreateFolderModal = ({
  currentPath,
  onCreated,
}: DriveCreateFolderModalProps) => {
  const { closeModal } = useModal();
  const { createFolder } = useDriveActions();
  const [folderName, setFolderName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const trimmedFolderName = folderName.trim();
  const isFolderNameValid =
    isNonEmptyString(trimmedFolderName) &&
    !trimmedFolderName.includes('/') &&
    trimmedFolderName !== '.' &&
    trimmedFolderName !== '..';

  const handleClose = () => {
    setFolderName('');
    setIsSaving(false);
    closeModal(DRIVE_CREATE_FOLDER_MODAL_ID);
  };

  const handleCreate = async () => {
    if (!isFolderNameValid || currentPath === '') {
      return;
    }

    setIsSaving(true);

    try {
      await createFolder(`${currentPath}/${trimmedFolderName}`);
      await onCreated();
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={DRIVE_CREATE_FOLDER_MODAL_ID}
      onClose={handleClose}
      onEnter={() => {
        void handleCreate();
      }}
      isClosable
      padding="large"
      overlay="dark"
      dataGloballyPreventClickOutside
      renderInDocumentBody
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      <StyledCenteredTitle>
        <H1Title title={t`New folder`} fontColor={H1TitleFontColor.Primary} />
      </StyledCenteredTitle>
      <StyledField>
        <SettingsTextInput
          instanceId="drive-create-folder-name"
          label={t`Name`}
          value={folderName}
          onChange={setFolderName}
          autoFocusOnMount
          fullWidth
        />
      </StyledField>
      <StyledActions>
        <Button
          onClick={handleClose}
          variant="secondary"
          title={t`Cancel`}
          fullWidth
          justify="center"
        />
        <Button
          onClick={() => {
            void handleCreate();
          }}
          variant="primary"
          accent="blue"
          title={t`Create`}
          disabled={!isFolderNameValid || isSaving}
          fullWidth
          justify="center"
        />
      </StyledActions>
    </ModalStatefulWrapper>
  );
};

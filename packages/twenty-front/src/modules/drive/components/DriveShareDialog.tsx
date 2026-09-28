import { useDriveActions } from '@/drive/hooks/useDriveActions';
import { type DriveAccessLevel, type DriveItem } from '@/drive/types/Drive';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { Select } from '@/ui/input/components/Select';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useState } from 'react';

const StyledDialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

type DriveShareDialogProps = {
  item: DriveItem;
  onClose: () => void;
  onShared: () => Promise<void>;
};

export const DriveShareDialog = ({
  item,
  onClose,
  onShared,
}: DriveShareDialogProps) => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { shareItem } = useDriveActions();
  const [recipientUserWorkspaceId, setRecipientUserWorkspaceId] = useState<
    string | null
  >(null);
  const [accessLevel, setAccessLevel] = useState<DriveAccessLevel>('READ');
  const [isSaving, setIsSaving] = useState(false);

  const recipientOptions = currentWorkspaceMembers
    .filter(
      (workspaceMember) =>
        isDefined(workspaceMember.userWorkspaceId) &&
        workspaceMember.userWorkspaceId !==
          currentWorkspaceMember?.userWorkspaceId,
    )
    .map((workspaceMember) => ({
      label:
        `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`.trim(),
      value: workspaceMember.userWorkspaceId as string,
    }));

  const handleShare = async () => {
    if (!isDefined(recipientUserWorkspaceId)) {
      return;
    }

    setIsSaving(true);

    try {
      await shareItem({
        path: item.virtualPath,
        userWorkspaceId: recipientUserWorkspaceId,
        accessLevel,
      });
      await onShared();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StyledDialog>
      <Select
        dropdownId="drive-share-recipient"
        label={t`Coworker`}
        options={recipientOptions}
        value={recipientUserWorkspaceId}
        onChange={setRecipientUserWorkspaceId}
        emptyOption={{ label: t`Select a coworker`, value: null }}
      />
      <Select
        dropdownId="drive-share-access-level"
        label={t`Access`}
        options={[
          { label: t`Read`, value: 'READ' },
          { label: t`Edit`, value: 'READ_WRITE' },
        ]}
        value={accessLevel}
        onChange={setAccessLevel}
      />
      <Button
        title={t`Share`}
        onClick={handleShare}
        disabled={!isDefined(recipientUserWorkspaceId) || isSaving}
      />
    </StyledDialog>
  );
};

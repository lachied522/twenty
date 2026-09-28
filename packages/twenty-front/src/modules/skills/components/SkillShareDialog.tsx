import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { Select } from '@/ui/input/components/Select';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useMutation, useQuery } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useMemo, useState } from 'react';
import {
  DriveAccessLevel,
  DrivePrincipalType,
  GetRolesDocument,
  ShareSkillDocument,
  SkillSharesDocument,
  UnshareSkillDocument,
} from '~/generated-metadata/graphql';

const StyledDialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledShareList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledShareRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

type SkillShareDialogProps = {
  skillId: string;
  onClose: () => void;
};

export const SkillShareDialog = ({
  skillId,
  onClose,
}: SkillShareDialogProps) => {
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { data: sharesData, refetch } = useQuery(SkillSharesDocument, {
    variables: { skillId },
  });
  const { data: rolesData } = useQuery(GetRolesDocument);
  const [shareSkill] = useMutation(ShareSkillDocument);
  const [unshareSkill] = useMutation(UnshareSkillDocument);

  const [principalType, setPrincipalType] = useState<DrivePrincipalType>(
    DrivePrincipalType.WORKSPACE_MEMBER,
  );
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<DriveAccessLevel>(
    DriveAccessLevel.READ,
  );
  const [isSaving, setIsSaving] = useState(false);

  const memberOptions = useMemo(
    () =>
      currentWorkspaceMembers
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
        })),
    [currentWorkspaceMembers, currentWorkspaceMember?.userWorkspaceId],
  );

  const roleOptions = useMemo(
    () =>
      (rolesData?.getRoles ?? []).map((role) => ({
        label: role.label,
        value: role.id,
      })),
    [rolesData?.getRoles],
  );

  const principalOptions =
    principalType === DrivePrincipalType.WORKSPACE_MEMBER
      ? memberOptions
      : roleOptions;

  const memberLabelById = useMemo(() => {
    const map = new Map<string, string>();

    for (const option of memberOptions) {
      map.set(option.value, option.label);
    }

    return map;
  }, [memberOptions]);

  const roleLabelById = useMemo(() => {
    const map = new Map<string, string>();

    for (const option of roleOptions) {
      map.set(option.value, option.label);
    }

    return map;
  }, [roleOptions]);

  const handleShare = async () => {
    if (!isDefined(principalId)) {
      return;
    }

    setIsSaving(true);

    try {
      await shareSkill({
        variables: {
          input: {
            skillId,
            principalType,
            principalId,
            accessLevel,
          },
        },
      });
      await refetch();
      setPrincipalId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnshare = async ({
    sharePrincipalType,
    sharePrincipalId,
  }: {
    sharePrincipalType: DrivePrincipalType;
    sharePrincipalId: string;
  }) => {
    await unshareSkill({
      variables: {
        input: {
          skillId,
          principalType: sharePrincipalType,
          principalId: sharePrincipalId,
        },
      },
    });
    await refetch();
  };

  return (
    <StyledDialog>
      <Select
        dropdownId="skill-share-principal-type"
        label={t`Share with`}
        options={[
          {
            label: t`Coworker`,
            value: DrivePrincipalType.WORKSPACE_MEMBER,
          },
          { label: t`Role`, value: DrivePrincipalType.ROLE },
        ]}
        value={principalType}
        onChange={(value) => {
          setPrincipalType(value);
          setPrincipalId(null);
        }}
      />
      <Select
        dropdownId="skill-share-principal"
        label={
          principalType === DrivePrincipalType.WORKSPACE_MEMBER
            ? t`Coworker`
            : t`Role`
        }
        options={principalOptions}
        value={principalId}
        onChange={setPrincipalId}
        emptyOption={{
          label:
            principalType === DrivePrincipalType.WORKSPACE_MEMBER
              ? t`Select a coworker`
              : t`Select a role`,
          value: null,
        }}
      />
      <Select
        dropdownId="skill-share-access-level"
        label={t`Access`}
        options={[
          { label: t`Read`, value: DriveAccessLevel.READ },
          { label: t`Edit`, value: DriveAccessLevel.READ_WRITE },
        ]}
        value={accessLevel}
        onChange={setAccessLevel}
      />
      <Button
        title={t`Share`}
        onClick={handleShare}
        disabled={!isDefined(principalId) || isSaving}
      />
      <StyledShareList>
        {(sharesData?.skillShares ?? []).map((share) => {
          const label =
            share.principalType === DrivePrincipalType.WORKSPACE_MEMBER
              ? (memberLabelById.get(share.principalId) ?? share.principalId)
              : (roleLabelById.get(share.principalId) ?? share.principalId);

          return (
            <StyledShareRow key={share.id}>
              <span>
                {label} ·{' '}
                {share.accessLevel === DriveAccessLevel.READ
                  ? t`Read`
                  : t`Edit`}
              </span>
              <Button
                title={t`Remove`}
                variant="secondary"
                onClick={() =>
                  handleUnshare({
                    sharePrincipalType: share.principalType,
                    sharePrincipalId: share.principalId,
                  })
                }
              />
            </StyledShareRow>
          );
        })}
      </StyledShareList>
      <Button title={t`Done`} variant="secondary" onClick={onClose} />
    </StyledDialog>
  );
};

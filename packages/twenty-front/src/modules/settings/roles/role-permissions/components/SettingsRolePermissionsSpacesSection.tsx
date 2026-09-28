import {
  LIST_DRIVE_SPACE_GRANTS,
  LIST_ORGANISATION_DRIVE_SPACES,
} from '@/drive/graphql/queries';
import { UPSERT_DRIVE_SPACE_GRANTS } from '@/drive/graphql/mutations';
import {
  type DriveSpace,
  type DriveSpaceGrant,
  type DriveSpaceGrantDraftLevel,
} from '@/drive/types/Drive';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useQuery, useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Radio, RadioGroup } from 'twenty-ui/input';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(120px, 1fr) auto;
`;

const StyledSpaceName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledRadios = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

type SettingsRolePermissionsSpacesSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsSpacesSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsSpacesSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const { data: spacesData } = useQuery<{
    listOrganisationDriveSpaces: DriveSpace[];
  }>(LIST_ORGANISATION_DRIVE_SPACES);
  const { data: grantsData, refetch } = useQuery<{
    listDriveSpaceGrants: DriveSpaceGrant[];
  }>(LIST_DRIVE_SPACE_GRANTS, {
    variables: { roleId },
    skip: settingsDraftRole.isEditable === false && isEditable === false,
  });
  const [upsertDriveSpaceGrants] = useMutation(UPSERT_DRIVE_SPACE_GRANTS);
  const [optimisticLevels, setOptimisticLevels] = useState<
    Record<string, DriveSpaceGrantDraftLevel>
  >({});

  const spaces = spacesData?.listOrganisationDriveSpaces ?? [];
  const grants = grantsData?.listDriveSpaceGrants ?? [];

  const getAccessLevel = (spaceId: string): DriveSpaceGrantDraftLevel => {
    const optimisticLevel = optimisticLevels[spaceId];

    if (isDefined(optimisticLevel)) {
      return optimisticLevel;
    }

    return (
      grants.find((spaceGrant) => spaceGrant.spaceId === spaceId)
        ?.accessLevel ?? 'NONE'
    );
  };

  const handleChange = async (
    spaceId: string,
    accessLevel: DriveSpaceGrantDraftLevel,
  ) => {
    setOptimisticLevels((currentDraft) => ({
      ...currentDraft,
      [spaceId]: accessLevel,
    }));

    if (!isEditable) {
      return;
    }

    await upsertDriveSpaceGrants({
      variables: {
        roleId,
        grants: [
          {
            spaceId,
            accessLevel: accessLevel === 'NONE' ? null : accessLevel,
          },
        ],
      },
    });
    await refetch();
    setOptimisticLevels((currentDraft) => {
      const nextDraft = { ...currentDraft };

      delete nextDraft[spaceId];

      return nextDraft;
    });
  };

  if (!isDefined(spacesData)) {
    return null;
  }

  return (
    <Section>
      <H2Title
        title={t`Spaces`}
        description={t`Choose which organisation file spaces this role can see and edit`}
      />
      <StyledTable>
        {spaces.map((space) => (
          <StyledRow key={space.id}>
            <StyledSpaceName>{space.name}</StyledSpaceName>
            <RadioGroup
              value={getAccessLevel(space.id)}
              onValueChange={(value) => {
                void handleChange(space.id, value as DriveSpaceGrantDraftLevel);
              }}
              disabled={!isEditable}
            >
              <StyledRadios>
                <Radio value="NONE">{t`None`}</Radio>
                <Radio value="READ">{t`Read`}</Radio>
                <Radio value="READ_WRITE">{t`Edit`}</Radio>
              </StyledRadios>
            </RadioGroup>
          </StyledRow>
        ))}
      </StyledTable>
    </Section>
  );
};

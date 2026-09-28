import { useCurrentDrivePath } from '@/drive/hooks/useCurrentDrivePath';
import { useDriveSpaces } from '@/drive/hooks/useDriveQueries';
import { type DriveSpace } from '@/drive/types/Drive';
import { getDrivePagePath } from '@/drive/utils/getDrivePagePath';
import { isDriveSpaceActive } from '@/drive/utils/isDriveSpaceActive';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconFiles, useIcons } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledScrollableItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const FilesNavigationDrawerContent = () => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { spaces } = useDriveSpaces();
  const currentPath = useCurrentDrivePath();

  const personalSpaces = spaces.filter(
    (space) => space.listKind === 'PERSONAL',
  );
  const organisationSpaces = spaces.filter(
    (space) => space.listKind === 'ORGANISATION',
  );
  const sharedSpaces = spaces.filter(
    (space) => space.listKind === 'SHARED_WITH_ME',
  );

  const renderSpaceItem = (space: DriveSpace) => {
    const Icon = getIcon(space.icon ?? undefined) ?? IconFiles;

    return (
      <NavigationDrawerItem
        key={space.id}
        label={space.name}
        Icon={Icon}
        to={getDrivePagePath(space.virtualPath)}
        active={isDriveSpaceActive({
          currentPath,
          spaceVirtualPath: space.virtualPath,
        })}
      />
    );
  };

  return (
    <StyledScrollableItemsContainer>
      {personalSpaces.length > 0 && (
        <NavigationDrawerSection>
          <NavigationDrawerAnimatedCollapseWrapper>
            <NavigationDrawerSectionTitle label={t`Personal`} />
          </NavigationDrawerAnimatedCollapseWrapper>
          {personalSpaces.map(renderSpaceItem)}
        </NavigationDrawerSection>
      )}
      {organisationSpaces.length > 0 && (
        <NavigationDrawerSection>
          <NavigationDrawerAnimatedCollapseWrapper>
            <NavigationDrawerSectionTitle label={t`Spaces`} />
          </NavigationDrawerAnimatedCollapseWrapper>
          {organisationSpaces.map(renderSpaceItem)}
        </NavigationDrawerSection>
      )}
      <NavigationDrawerSection>
        <NavigationDrawerAnimatedCollapseWrapper>
          <NavigationDrawerSectionTitle label={t`Shared with me`} />
        </NavigationDrawerAnimatedCollapseWrapper>
        {sharedSpaces.length === 0 ? (
          <NavigationDrawerItem
            label={t`Nothing shared yet`}
            variant="tertiary"
          />
        ) : (
          sharedSpaces.map(renderSpaceItem)
        )}
      </NavigationDrawerSection>
    </StyledScrollableItemsContainer>
  );
};

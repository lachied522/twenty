import { type DrivePathCrumb } from '@/drive/utils/getDrivePathCrumbs';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Fragment } from 'react';
import { IconChevronLeft } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledNav = styled.nav`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};
`;

const StyledCrumbs = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  overflow: hidden;
`;

const StyledCrumbButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  overflow: hidden;
  padding: 0;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledCurrentCrumb = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDivider = styled.span`
  flex: 0 0 auto;
`;

type DrivePathBreadcrumbProps = {
  crumbs: DrivePathCrumb[];
  onNavigate: (path: string) => void;
};

export const DrivePathBreadcrumb = ({
  crumbs,
  onNavigate,
}: DrivePathBreadcrumbProps) => {
  if (crumbs.length === 0) {
    return null;
  }

  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : undefined;

  return (
    <StyledNav aria-label={t`Folder path`}>
      {parentCrumb !== undefined && (
        <Button
          Icon={IconChevronLeft}
          title={t`Back`}
          variant="secondary"
          onClick={() => onNavigate(parentCrumb.path)}
        />
      )}
      <StyledCrumbs>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {crumb.isCurrent ? (
              <StyledCurrentCrumb title={crumb.name}>
                {crumb.name}
              </StyledCurrentCrumb>
            ) : (
              <StyledCrumbButton
                type="button"
                title={crumb.name}
                onClick={() => onNavigate(crumb.path)}
              >
                {crumb.name}
              </StyledCrumbButton>
            )}
            {index < crumbs.length - 1 && <StyledDivider>/</StyledDivider>}
          </Fragment>
        ))}
      </StyledCrumbs>
    </StyledNav>
  );
};

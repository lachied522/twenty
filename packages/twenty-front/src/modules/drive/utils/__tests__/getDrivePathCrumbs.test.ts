import { type DriveSpace } from '@/drive/types/Drive';
import {
  getDrivePathCrumbs,
  getParentDrivePath,
} from '@/drive/utils/getDrivePathCrumbs';
import { isDriveSpaceActive } from '@/drive/utils/isDriveSpaceActive';

const personalSpace: DriveSpace = {
  id: 'space-1',
  listKind: 'PERSONAL',
  kind: 'PERSONAL',
  name: 'Personal',
  slug: 'personal',
  virtualPath: '/personal',
  accessLevel: 'READ_WRITE',
};

describe('getDrivePathCrumbs', () => {
  it('returns the space root as the current crumb', () => {
    expect(
      getDrivePathCrumbs({
        currentPath: '/personal',
        space: personalSpace,
      }),
    ).toEqual([
      {
        name: 'Personal',
        path: '/personal',
        isCurrent: true,
      },
    ]);
  });

  it('builds clickable crumbs for nested folders', () => {
    expect(
      getDrivePathCrumbs({
        currentPath: '/personal/Invoices/2026',
        space: personalSpace,
      }),
    ).toEqual([
      {
        name: 'Personal',
        path: '/personal',
        isCurrent: false,
      },
      {
        name: 'Invoices',
        path: '/personal/Invoices',
        isCurrent: false,
      },
      {
        name: '2026',
        path: '/personal/Invoices/2026',
        isCurrent: true,
      },
    ]);
  });
});

describe('isDriveSpaceActive', () => {
  it('is active at the space root', () => {
    expect(
      isDriveSpaceActive({
        currentPath: '/personal',
        spaceVirtualPath: '/personal',
      }),
    ).toBe(true);
  });

  it('is active inside a nested folder', () => {
    expect(
      isDriveSpaceActive({
        currentPath: '/personal/Invoices/2026',
        spaceVirtualPath: '/personal',
      }),
    ).toBe(true);
  });

  it('is not active for a different space', () => {
    expect(
      isDriveSpaceActive({
        currentPath: '/spaces/finance',
        spaceVirtualPath: '/personal',
      }),
    ).toBe(false);
  });
});

describe('getParentDrivePath', () => {
  it('stays on the space root instead of walking to /personal parent', () => {
    expect(
      getParentDrivePath({
        currentPath: '/personal',
        spaceVirtualPath: '/personal',
      }),
    ).toBe('/personal');
  });

  it('returns the space root from a first-level folder', () => {
    expect(
      getParentDrivePath({
        currentPath: '/personal/Invoices',
        spaceVirtualPath: '/personal',
      }),
    ).toBe('/personal');
  });

  it('returns the parent folder for nested paths', () => {
    expect(
      getParentDrivePath({
        currentPath: '/spaces/finance/Invoices/2026',
        spaceVirtualPath: '/spaces/finance',
      }),
    ).toBe('/spaces/finance/Invoices');
  });
});

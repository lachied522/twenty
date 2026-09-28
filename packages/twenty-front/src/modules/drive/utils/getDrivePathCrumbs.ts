import { type DriveSpace } from '@/drive/types/Drive';
import { isDefined } from 'twenty-shared/utils';

export type DrivePathCrumb = {
  name: string;
  path: string;
  isCurrent: boolean;
};

export const getDrivePathCrumbs = ({
  currentPath,
  space,
}: {
  currentPath: string;
  space: DriveSpace | undefined;
}): DrivePathCrumb[] => {
  if (!isDefined(space) || currentPath === '') {
    return [];
  }

  if (
    currentPath === space.virtualPath ||
    !currentPath.startsWith(`${space.virtualPath}/`)
  ) {
    return [
      {
        name: space.name,
        path: space.virtualPath,
        isCurrent: true,
      },
    ];
  }

  const restSegments = currentPath
    .slice(space.virtualPath.length + 1)
    .split('/')
    .filter(Boolean);

  return restSegments.reduce<DrivePathCrumb[]>(
    (crumbs, segment, index) => {
      const parentPath = crumbs[crumbs.length - 1].path;

      crumbs.push({
        name: segment,
        path: `${parentPath}/${segment}`,
        isCurrent: index === restSegments.length - 1,
      });

      return crumbs;
    },
    [
      {
        name: space.name,
        path: space.virtualPath,
        isCurrent: false,
      },
    ],
  );
};

export const getParentDrivePath = ({
  currentPath,
  spaceVirtualPath,
}: {
  currentPath: string;
  spaceVirtualPath: string;
}): string => {
  if (
    currentPath === spaceVirtualPath ||
    !currentPath.startsWith(`${spaceVirtualPath}/`)
  ) {
    return spaceVirtualPath;
  }

  const restSegments = currentPath
    .slice(spaceVirtualPath.length + 1)
    .split('/')
    .filter(Boolean);

  if (restSegments.length <= 1) {
    return spaceVirtualPath;
  }

  return `${spaceVirtualPath}/${restSegments.slice(0, -1).join('/')}`;
};

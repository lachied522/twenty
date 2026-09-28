export const isDriveSpaceActive = ({
  currentPath,
  spaceVirtualPath,
}: {
  currentPath: string;
  spaceVirtualPath: string;
}) =>
  currentPath === spaceVirtualPath ||
  currentPath.startsWith(`${spaceVirtualPath}/`);

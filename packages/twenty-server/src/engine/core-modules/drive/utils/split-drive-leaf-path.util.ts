import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';
import {
  joinDriveVirtualPath,
  parseDriveVirtualPath,
} from 'src/engine/core-modules/drive/utils/parse-drive-virtual-path.util';

export const splitDriveLeafPath = (
  path: string,
): { parentPath: string; name: string } => {
  const parsedPath = parseDriveVirtualPath(path);

  if (parsedPath.prefix === 'shared-root') {
    throw new DriveException(
      'Cannot create or rename the shared-with-me root',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  if (parsedPath.prefix === 'personal') {
    if (parsedPath.restSegments.length === 0) {
      throw new DriveException(
        'Cannot create or rename the personal space root',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const name = parsedPath.restSegments[parsedPath.restSegments.length - 1];

    return {
      parentPath: joinDriveVirtualPath([
        'personal',
        ...parsedPath.restSegments.slice(0, -1),
      ]),
      name,
    };
  }

  if (parsedPath.prefix === 'organisation') {
    if (parsedPath.restSegments.length === 0) {
      throw new DriveException(
        'Cannot create or rename an organisation space root',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const name = parsedPath.restSegments[parsedPath.restSegments.length - 1];

    return {
      parentPath: joinDriveVirtualPath([
        'spaces',
        parsedPath.slug,
        ...parsedPath.restSegments.slice(0, -1),
      ]),
      name,
    };
  }

  if (parsedPath.restSegments.length === 0) {
    throw new DriveException(
      'Cannot create or rename a shared item root this way',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  const name = parsedPath.restSegments[parsedPath.restSegments.length - 1];

  return {
    parentPath: joinDriveVirtualPath([
      'shared',
      parsedPath.itemId,
      ...parsedPath.restSegments.slice(0, -1),
    ]),
    name,
  };
};

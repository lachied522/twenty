import { isNonEmptyString } from '@sniptt/guards';

import { DRIVE_MAX_ITEM_NAME_LENGTH } from 'src/engine/core-modules/drive/drive.constants';
import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';

export const assertValidDriveItemName = (name: string): void => {
  if (!isNonEmptyString(name) || name.trim() !== name) {
    throw new DriveException(
      'File or folder name is invalid',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  if (
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\0')
  ) {
    throw new DriveException(
      'File or folder name is invalid',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  if (name.length > DRIVE_MAX_ITEM_NAME_LENGTH) {
    throw new DriveException(
      'File or folder name is too long',
      DriveExceptionCode.BAD_REQUEST,
    );
  }
};

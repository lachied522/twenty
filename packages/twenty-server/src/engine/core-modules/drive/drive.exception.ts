import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { DRIVE_NOT_FOUND_MESSAGE } from 'src/engine/core-modules/drive/drive.constants';
import { CustomException } from 'src/utils/custom-exception';

export enum DriveExceptionCode {
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
}

const getDriveExceptionUserFriendlyMessage = (code: DriveExceptionCode) => {
  switch (code) {
    case DriveExceptionCode.NOT_FOUND:
      return msg`File not found.`;
    case DriveExceptionCode.FORBIDDEN:
      return msg`You do not have permission to do that.`;
    case DriveExceptionCode.BAD_REQUEST:
      return msg`Invalid Drive request.`;
    case DriveExceptionCode.CONFLICT:
      return msg`A file or folder with that name already exists.`;
    default:
      assertUnreachable(code);
  }
};

export class DriveException extends CustomException<DriveExceptionCode> {
  constructor(
    message: string,
    code: DriveExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getDriveExceptionUserFriendlyMessage(code),
    });
  }
}

export const driveNotFoundException = () =>
  new DriveException(DRIVE_NOT_FOUND_MESSAGE, DriveExceptionCode.NOT_FOUND);

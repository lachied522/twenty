import { Catch, type ExceptionFilter } from '@nestjs/common';

import { assertUnreachable } from 'twenty-shared/utils';

import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

@Catch(DriveException)
export class DriveExceptionFilter implements ExceptionFilter {
  catch(exception: DriveException) {
    switch (exception.code) {
      case DriveExceptionCode.NOT_FOUND:
        throw new NotFoundError(exception);
      case DriveExceptionCode.FORBIDDEN:
        throw new ForbiddenError(exception);
      case DriveExceptionCode.BAD_REQUEST:
        throw new UserInputError(exception);
      case DriveExceptionCode.CONFLICT:
        throw new ConflictError(exception);
      default: {
        assertUnreachable(exception.code);
      }
    }
  }
}

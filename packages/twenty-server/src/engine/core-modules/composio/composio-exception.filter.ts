import { Catch, type ExceptionFilter } from '@nestjs/common';

import { assertUnreachable } from 'twenty-shared/utils';

import {
  ComposioException,
  ComposioExceptionCode,
} from 'src/engine/core-modules/composio/composio.exception';
import {
  ForbiddenError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

@Catch(ComposioException)
export class ComposioExceptionFilter implements ExceptionFilter {
  catch(exception: ComposioException) {
    switch (exception.code) {
      case ComposioExceptionCode.NOT_CONFIGURED:
        throw new ForbiddenError(exception);
      case ComposioExceptionCode.NOT_FOUND:
        throw new NotFoundError(exception);
      case ComposioExceptionCode.BAD_REQUEST:
      case ComposioExceptionCode.UNAVAILABLE:
        throw new UserInputError(exception);
      default: {
        assertUnreachable(exception.code);
      }
    }
  }
}

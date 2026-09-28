import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { CustomException } from 'src/utils/custom-exception';

export enum ComposioExceptionCode {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAVAILABLE = 'UNAVAILABLE',
}

const getComposioExceptionUserFriendlyMessage = (
  code: ComposioExceptionCode,
): MessageDescriptor => {
  switch (code) {
    case ComposioExceptionCode.NOT_CONFIGURED:
      return msg`Integrations are not configured on this instance.`;
    case ComposioExceptionCode.NOT_FOUND:
      return msg`Integration account not found.`;
    case ComposioExceptionCode.BAD_REQUEST:
      return msg`Invalid integration request.`;
    case ComposioExceptionCode.UNAVAILABLE:
      return msg`This integration is not available. Please contact support.`;
  }
};

export class ComposioException extends CustomException<ComposioExceptionCode> {
  constructor(
    message: string,
    code: ComposioExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getComposioExceptionUserFriendlyMessage(code),
    });
  }
}

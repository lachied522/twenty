import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';

import { type Response } from 'express';

import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';
import { HttpExceptionHandlerService } from 'src/engine/core-modules/exception-handler/http-exception-handler.service';

@Catch(DriveException)
export class DriveRestApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpExceptionHandlerService: HttpExceptionHandlerService,
  ) {}

  catch(exception: DriveException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case DriveExceptionCode.NOT_FOUND:
        return this.httpExceptionHandlerService.handleError(
          exception,
          response,
          404,
        );
      case DriveExceptionCode.FORBIDDEN:
        return this.httpExceptionHandlerService.handleError(
          exception,
          response,
          403,
        );
      case DriveExceptionCode.CONFLICT:
        return this.httpExceptionHandlerService.handleError(
          exception,
          response,
          409,
        );
      case DriveExceptionCode.BAD_REQUEST:
        return this.httpExceptionHandlerService.handleError(
          exception,
          response,
          400,
        );
      default:
        return this.httpExceptionHandlerService.handleError(
          exception,
          response,
          500,
        );
    }
  }
}

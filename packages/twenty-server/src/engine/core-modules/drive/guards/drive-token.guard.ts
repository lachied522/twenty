import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

import { type DriveTokenJwtPayload } from 'src/engine/core-modules/auth/types/drive-token-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';

@Injectable()
export class DriveTokenGuard implements CanActivate {
  constructor(private readonly jwtWrapperService: JwtWrapperService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.jwtWrapperService.extractJwtFromRequest()(request);

    if (!isNonEmptyString(token)) {
      throw new UnauthorizedException('Drive token is required');
    }

    let payload: DriveTokenJwtPayload;

    try {
      payload = await this.jwtWrapperService.verifyJwtToken(token);
    } catch {
      throw new UnauthorizedException('Drive token is invalid');
    }

    if (
      payload.type !== JwtTokenTypeEnum.DRIVE ||
      !isNonEmptyString(payload.workspaceId) ||
      !isNonEmptyString(payload.userWorkspaceId)
    ) {
      throw new UnauthorizedException('Drive token is invalid');
    }

    request.workspaceId = payload.workspaceId;
    request.userWorkspaceId = payload.userWorkspaceId;

    return true;
  }
}

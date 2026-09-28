import { Injectable, Logger } from '@nestjs/common';

import { Composio } from '@composio/core';
import { isNonEmptyString } from '@sniptt/guards';

import {
  ComposioException,
  ComposioExceptionCode,
} from 'src/engine/core-modules/composio/composio.exception';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class ComposioClientService {
  private readonly logger = new Logger(ComposioClientService.name);
  private composioSingleton: Composio | null = null;

  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  isConfigured(): boolean {
    return isNonEmptyString(this.twentyConfigService.get('COMPOSIO_API_KEY'));
  }

  getClient(): Composio {
    const apiKey = this.twentyConfigService.get('COMPOSIO_API_KEY');

    if (!isNonEmptyString(apiKey)) {
      throw new ComposioException(
        'COMPOSIO_API_KEY is not configured',
        ComposioExceptionCode.NOT_CONFIGURED,
      );
    }

    if (!this.composioSingleton) {
      this.composioSingleton = new Composio({ apiKey });
      this.logger.log('Composio client initialised');
    }

    return this.composioSingleton;
  }
}

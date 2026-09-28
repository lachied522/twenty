import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

export const getDrivePagePath = (virtualPath?: string) =>
  getAppPath(
    AppPath.Files,
    undefined,
    isNonEmptyString(virtualPath) ? { path: virtualPath } : undefined,
  );

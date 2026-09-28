import { AppPath } from 'twenty-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isFilesPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.Files);

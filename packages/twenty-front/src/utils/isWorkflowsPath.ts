import { AppPath } from 'twenty-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isWorkflowsPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.Workflows);

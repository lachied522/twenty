import { AppPath } from 'twenty-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isSkillsPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.Skills);

import { AppPath } from 'twenty-shared/types';

import { getDrivePagePath } from '@/drive/utils/getDrivePagePath';

describe('getDrivePagePath', () => {
  it('returns the Files route without a path', () => {
    expect(getDrivePagePath()).toBe(AppPath.Files);
  });

  it('puts the virtual path on the query string', () => {
    expect(getDrivePagePath('/personal')).toBe('/drive?path=%2Fpersonal');
  });
});

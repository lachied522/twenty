import { renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { type ReactNode } from 'react';

import { useObjectNamePluralFromRoute } from '@/object-metadata/hooks/useObjectNamePluralFromRoute';
import { CoreObjectNamePlural } from '@/object-metadata/types/CoreObjectNamePlural';
import { AppPath } from 'twenty-shared/types';

const renderUseObjectNamePluralFromRoute = (initialEntry: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={AppPath.Workflows} element={children} />
        <Route path={AppPath.RecordIndexPage} element={children} />
      </Routes>
    </MemoryRouter>
  );

  return renderHook(() => useObjectNamePluralFromRoute(), { wrapper });
};

describe('useObjectNamePluralFromRoute', () => {
  it('returns workflows on the Home Workflows shortcut path', () => {
    const { result } = renderUseObjectNamePluralFromRoute(AppPath.Workflows);

    expect(result.current).toBe(CoreObjectNamePlural.Workflow);
  });

  it('returns the objectNamePlural route param on record index paths', () => {
    const { result } = renderUseObjectNamePluralFromRoute('/objects/people');

    expect(result.current).toBe('people');
  });
});

import { isWorkflowRelatedPath } from '~/utils/isWorkflowRelatedPath';

describe('isWorkflowRelatedPath', () => {
  it.each([
    '/workflows',
    '/objects/workflows',
    '/objects/workflowRuns',
    '/objects/workflowVersions',
    '/object/workflow/20202020-0687-4c41-b707-ed1bfca972a7',
    '/object/workflowRun/20202020-0687-4c41-b707-ed1bfca972a7',
    '/object/workflowVersion/20202020-0687-4c41-b707-ed1bfca972a7',
    '/workflow-core',
  ])('is true for %s', (pathname) => {
    expect(isWorkflowRelatedPath(pathname)).toBe(true);
  });

  it.each(['/objects/people', '/skills', '/integrations', '/chat'])(
    'is false for %s',
    (pathname) => {
      expect(isWorkflowRelatedPath(pathname)).toBe(false);
    },
  );
});

import { matchPath } from 'react-router-dom';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';

import { CoreObjectNamePlural } from '@/object-metadata/types/CoreObjectNamePlural';
import { isWorkflowsPath } from '~/utils/isWorkflowsPath';

const WORKFLOW_OBJECT_NAME_PLURALS = new Set<string>([
  CoreObjectNamePlural.Workflow,
  CoreObjectNamePlural.WorkflowRun,
  CoreObjectNamePlural.WorkflowVersion,
]);

const WORKFLOW_OBJECT_NAME_SINGULARS = new Set<string>([
  CoreObjectNameSingular.Workflow,
  CoreObjectNameSingular.WorkflowVersion,
  CoreObjectNameSingular.WorkflowRun,
]);

// Home drawer stays selected on the short /workflows index and on the object
// routes that open a workflow, its runs, or its versions from that index.
export const isWorkflowRelatedPath = (pathname: string) => {
  if (isWorkflowsPath(pathname)) {
    return true;
  }

  const recordIndexMatch = matchPath(AppPath.RecordIndexPage, pathname);
  if (
    WORKFLOW_OBJECT_NAME_PLURALS.has(
      recordIndexMatch?.params.objectNamePlural ?? '',
    )
  ) {
    return true;
  }

  const recordShowMatch = matchPath(AppPath.RecordShowPage, pathname);
  if (
    WORKFLOW_OBJECT_NAME_SINGULARS.has(
      recordShowMatch?.params.objectNameSingular ?? '',
    )
  ) {
    return true;
  }

  return isMatchingWorkflowCoreIndexPath(pathname);
};

const isMatchingWorkflowCoreIndexPath = (pathname: string) =>
  matchPath(AppPath.WorkflowCoreIndexPage, pathname) !== null;

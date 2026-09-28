import { useLocation, useParams } from 'react-router-dom';

import { CoreObjectNamePlural } from '@/object-metadata/types/CoreObjectNamePlural';
import { isWorkflowsPath } from '~/utils/isWorkflowsPath';

// /workflows is a Home shortcut onto the workflows object index and does not
// carry :objectNamePlural, so supply the plural name callers already expect.
export const useObjectNamePluralFromRoute = () => {
  const { pathname } = useLocation();
  const { objectNamePlural: objectNamePluralFromParams } = useParams<{
    objectNamePlural: string;
  }>();

  if (isWorkflowsPath(pathname)) {
    return CoreObjectNamePlural.Workflow;
  }

  return objectNamePluralFromParams ?? '';
};

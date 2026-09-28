import { useLocation } from 'react-router-dom';

import { isAiChatPath } from '~/utils/isAiChatPath';
import { isFilesPath } from '~/utils/isFilesPath';
import { isIntegrationsPath } from '~/utils/isIntegrationsPath';
import { isSettingsPath } from '~/utils/isSettingsPath';
import { isSkillsPath } from '~/utils/isSkillsPath';
import { isWorkflowRelatedPath } from '~/utils/isWorkflowRelatedPath';

export const useIsLayoutCustomizationAllowedOnCurrentPage = () => {
  const { pathname } = useLocation();

  return (
    !isAiChatPath(pathname) &&
    !isSettingsPath(pathname) &&
    !isFilesPath(pathname) &&
    !isIntegrationsPath(pathname) &&
    !isSkillsPath(pathname) &&
    !isWorkflowRelatedPath(pathname)
  );
};

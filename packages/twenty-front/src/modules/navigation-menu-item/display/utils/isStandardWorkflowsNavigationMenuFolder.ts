import { CoreObjectNameSingular, NavigationMenuItemType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { isNavigationMenuItemFolder } from '@/navigation-menu-item/common/utils/isNavigationMenuItemFolder';
import { getObjectMetadataForNavigationMenuItem } from '@/navigation-menu-item/display/object/utils/getObjectMetadataForNavigationMenuItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type View } from '@/views/types/View';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

const WORKFLOW_OBJECT_NAME_SINGULARS = new Set<string>([
  CoreObjectNameSingular.Workflow,
  CoreObjectNameSingular.WorkflowRun,
  CoreObjectNameSingular.WorkflowVersion,
]);

// The seeded Work sidebar folder whose children are the workflow object
// indexes. Home owns that surface now, so the folder is hidden rather than
// deleted from seeded navigation menu items.
export const isStandardWorkflowsNavigationMenuFolder = ({
  folder,
  folderChildren,
  objectMetadataItems,
  views,
}: {
  folder: NavigationMenuItem;
  folderChildren: NavigationMenuItem[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
  views: Pick<View, 'id' | 'objectMetadataId'>[];
}) => {
  if (!isNavigationMenuItemFolder(folder)) {
    return false;
  }

  // User-created folders stay visible even when they reuse the automation icon.
  if (isDefined(folder.userWorkspaceId)) {
    return false;
  }

  if (folderChildren.length === 0) {
    return folder.icon === 'IconSettingsAutomation';
  }

  return folderChildren.every((folderChild) => {
    if (
      folderChild.type !== NavigationMenuItemType.OBJECT &&
      folderChild.type !== NavigationMenuItemType.VIEW
    ) {
      return false;
    }

    const objectMetadataItem = getObjectMetadataForNavigationMenuItem(
      folderChild,
      objectMetadataItems,
      views,
    );

    return (
      isDefined(objectMetadataItem) &&
      WORKFLOW_OBJECT_NAME_SINGULARS.has(objectMetadataItem.nameSingular)
    );
  });
};

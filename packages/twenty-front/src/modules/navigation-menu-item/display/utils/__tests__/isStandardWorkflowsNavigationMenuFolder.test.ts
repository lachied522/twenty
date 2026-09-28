import { CoreObjectNameSingular, NavigationMenuItemType } from 'twenty-shared/types';

import { isStandardWorkflowsNavigationMenuFolder } from '@/navigation-menu-item/display/utils/isStandardWorkflowsNavigationMenuFolder';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

const workflowObjectMetadataItem = {
  id: 'workflow-metadata-id',
  nameSingular: CoreObjectNameSingular.Workflow,
} as EnrichedObjectMetadataItem;

const companyObjectMetadataItem = {
  id: 'company-metadata-id',
  nameSingular: CoreObjectNameSingular.Company,
} as EnrichedObjectMetadataItem;

const workflowsFolder = {
  id: 'workflows-folder-id',
  type: NavigationMenuItemType.FOLDER,
  icon: 'IconSettingsAutomation',
  userWorkspaceId: null,
} as NavigationMenuItem;

describe('isStandardWorkflowsNavigationMenuFolder', () => {
  it('matches the seeded folder whose children are workflow objects', () => {
    expect(
      isStandardWorkflowsNavigationMenuFolder({
        folder: workflowsFolder,
        folderChildren: [
          {
            id: 'workflows-child-id',
            type: NavigationMenuItemType.OBJECT,
            targetObjectMetadataId: workflowObjectMetadataItem.id,
            folderId: workflowsFolder.id,
          } as NavigationMenuItem,
        ],
        objectMetadataItems: [workflowObjectMetadataItem],
        views: [],
      }),
    ).toBe(true);
  });

  it('does not match a user-created folder', () => {
    expect(
      isStandardWorkflowsNavigationMenuFolder({
        folder: {
          ...workflowsFolder,
          userWorkspaceId: 'user-workspace-id',
        },
        folderChildren: [
          {
            id: 'workflows-child-id',
            type: NavigationMenuItemType.OBJECT,
            targetObjectMetadataId: workflowObjectMetadataItem.id,
            folderId: workflowsFolder.id,
          } as NavigationMenuItem,
        ],
        objectMetadataItems: [workflowObjectMetadataItem],
        views: [],
      }),
    ).toBe(false);
  });

  it('does not match a folder with non-workflow children', () => {
    expect(
      isStandardWorkflowsNavigationMenuFolder({
        folder: workflowsFolder,
        folderChildren: [
          {
            id: 'companies-child-id',
            type: NavigationMenuItemType.OBJECT,
            targetObjectMetadataId: companyObjectMetadataItem.id,
            folderId: workflowsFolder.id,
          } as NavigationMenuItem,
        ],
        objectMetadataItems: [companyObjectMetadataItem],
        views: [],
      }),
    ).toBe(false);
  });
});

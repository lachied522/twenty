import {
  DRIVE_CREATE_FOLDER_MODAL_ID,
  DriveCreateFolderModal,
} from '@/drive/components/DriveCreateFolderModal';
import { DriveEmptyState } from '@/drive/components/DriveEmptyState';
import { DriveItemRow } from '@/drive/components/DriveItemRow';
import { DrivePathBreadcrumb } from '@/drive/components/DrivePathBreadcrumb';
import { DriveShareDialog } from '@/drive/components/DriveShareDialog';
import { FilesNavigationDrawerContent } from '@/drive/components/FilesNavigationDrawerContent';
import { useCurrentDrivePath } from '@/drive/hooks/useCurrentDrivePath';
import { useDriveActions } from '@/drive/hooks/useDriveActions';
import { useDriveItems, useDriveSpaces } from '@/drive/hooks/useDriveQueries';
import { type DriveItem } from '@/drive/types/Drive';
import { getDrivePagePath } from '@/drive/utils/getDrivePagePath';
import { getDrivePathCrumbs } from '@/drive/utils/getDrivePathCrumbs';
import { isDriveSpaceActive } from '@/drive/utils/isDriveSpaceActive';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  type ChangeEvent,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconFiles, IconPlus, IconUpload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const DocumentViewer = lazy(() =>
  import('@/activities/files/components/DocumentViewer').then((module) => ({
    default: module.DocumentViewer,
  })),
);

const StyledLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const StyledToolbar = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHiddenInput = styled.input`
  display: none;
`;

export const FilesPage = () => {
  const { openModal } = useModal();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { spaces, refetch: refetchSpaces } = useDriveSpaces();
  const currentPath = useCurrentDrivePath();
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [shareItem, setShareItem] = useState<DriveItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    items,
    loading: isLoadingItems,
    refetch: refetchItems,
  } = useDriveItems(currentPath);
  const { deleteItem, renameItem, uploadFile } = useDriveActions();

  const currentSpace = useMemo(
    () =>
      spaces.find((space) =>
        isDriveSpaceActive({
          currentPath,
          spaceVirtualPath: space.virtualPath,
        }),
      ),
    [spaces, currentPath],
  );

  useEffect(() => {
    if (currentPath !== '' || spaces.length === 0) {
      return;
    }

    const personalSpace = spaces.find((space) => space.listKind === 'PERSONAL');

    navigate(
      getDrivePagePath(personalSpace?.virtualPath ?? spaces[0].virtualPath),
      { replace: true },
    );
  }, [spaces, currentPath, navigate]);

  const canWrite = currentSpace?.accessLevel === 'READ_WRITE';
  const isPersonalSpace = currentSpace?.listKind === 'PERSONAL';
  const crumbs = getDrivePathCrumbs({
    currentPath,
    space: currentSpace,
  });

  const refresh = async () => {
    await refetchSpaces();
    await refetchItems();
  };

  const handleNavigate = (path: string) => {
    setPreviewItem(null);
    navigate(getDrivePagePath(path));
  };

  const handleOpenCreateFolderModal = () => {
    openModal(DRIVE_CREATE_FOLDER_MODAL_ID);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!isDefined(file)) {
      return;
    }

    await uploadFile({ parentPath: currentPath, file });
    event.target.value = '';
    await refresh();
  };

  const handleOpenItem = (item: DriveItem) => {
    if (item.kind === 'FOLDER') {
      handleNavigate(item.virtualPath);

      return;
    }

    setPreviewItem(item);
  };

  const handleRename = async (item: DriveItem) => {
    const newName = window.prompt(t`Rename`, item.name);

    if (!isDefined(newName) || newName.trim() === '' || newName === item.name) {
      return;
    }

    await renameItem(item.virtualPath, newName.trim());
    await refresh();
  };

  const handleDelete = async (item: DriveItem) => {
    if (!window.confirm(t`Delete ${item.name}?`)) {
      return;
    }

    await deleteItem(item.virtualPath);

    if (previewItem?.id === item.id) {
      setPreviewItem(null);
    }

    await refresh();
  };

  return (
    <>
      <PageTitle title={t`Files`} />
      <PageCardLayout
        header={
          <PageCardHeader icon={<IconFiles size={16} />} title={t`Files`} />
        }
      >
        <StyledLayout>
          {isMobile && <FilesNavigationDrawerContent />}
          {canWrite && (
            <StyledToolbar>
              <Button
                Icon={IconUpload}
                title={t`Upload`}
                onClick={handleUploadClick}
              />
              <Button
                Icon={IconPlus}
                title={t`New folder`}
                onClick={handleOpenCreateFolderModal}
              />
              <StyledHiddenInput
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
              />
            </StyledToolbar>
          )}
          <DrivePathBreadcrumb crumbs={crumbs} onNavigate={handleNavigate} />
          {!isLoadingItems && items.length === 0 && currentPath !== '' && (
            <DriveEmptyState
              canWrite={canWrite}
              onUploadClick={handleUploadClick}
              onCreateFolderClick={handleOpenCreateFolderModal}
            />
          )}
          {items.map((item) => (
            <DriveItemRow
              key={item.id}
              item={item}
              canWrite={canWrite}
              canShare={isPersonalSpace && canWrite}
              onOpen={handleOpenItem}
              onRename={(itemToRename) => {
                void handleRename(itemToRename);
              }}
              onDelete={(itemToDelete) => {
                void handleDelete(itemToDelete);
              }}
              onShare={setShareItem}
            />
          ))}
          {isDefined(previewItem) && isDefined(previewItem.downloadUrl) && (
            <Suspense fallback={null}>
              <DocumentViewer
                documentName={previewItem.name}
                documentUrl={previewItem.downloadUrl}
              />
            </Suspense>
          )}
          {isDefined(shareItem) && (
            <DriveShareDialog
              item={shareItem}
              onClose={() => setShareItem(null)}
              onShared={refresh}
            />
          )}
          <DriveCreateFolderModal
            currentPath={currentPath}
            onCreated={refresh}
          />
        </StyledLayout>
      </PageCardLayout>
    </>
  );
};

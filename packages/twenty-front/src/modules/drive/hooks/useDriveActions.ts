import {
  COMPLETE_DRIVE_FILE_UPLOAD,
  CREATE_DRIVE_FILE_UPLOAD,
  CREATE_DRIVE_FOLDER,
  DELETE_DRIVE_ITEM,
  RENAME_DRIVE_ITEM,
  SHARE_DRIVE_ITEM,
} from '@/drive/graphql/mutations';
import { type DriveAccessLevel, type DriveItem } from '@/drive/types/Drive';
import { useMutation } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';

export const useDriveActions = () => {
  const [createDriveFolder] = useMutation(CREATE_DRIVE_FOLDER);
  const [createDriveFileUpload] = useMutation(CREATE_DRIVE_FILE_UPLOAD);
  const [completeDriveFileUpload] = useMutation(COMPLETE_DRIVE_FILE_UPLOAD);
  const [renameDriveItem] = useMutation(RENAME_DRIVE_ITEM);
  const [deleteDriveItem] = useMutation(DELETE_DRIVE_ITEM);
  const [shareDriveItem] = useMutation(SHARE_DRIVE_ITEM);

  const createFolder = async (path: string) => {
    await createDriveFolder({ variables: { path } });
  };

  const uploadFile = async ({
    parentPath,
    file,
  }: {
    parentPath: string;
    file: File;
  }) => {
    const destinationPath = `${parentPath}/${file.name}`.replace('//', '/');
    const createResult = await createDriveFileUpload({
      variables: { path: destinationPath, size: file.size },
    });
    const uploadTarget = createResult.data?.createDriveFileUpload as
      | {
          fileId: string;
          uploadUrl: string;
          contentType: string;
        }
      | undefined;

    if (!isDefined(uploadTarget)) {
      throw new Error('Failed to initiate file upload');
    }

    const putResponse = await fetch(uploadTarget.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadTarget.contentType },
      body: file,
      credentials: 'omit',
    });

    if (!putResponse.ok) {
      throw new Error(`File upload failed with status ${putResponse.status}`);
    }

    const completeResult = await completeDriveFileUpload({
      variables: { fileId: uploadTarget.fileId },
    });

    return completeResult.data?.completeDriveFileUpload as
      | DriveItem
      | undefined;
  };

  const renameItem = async (path: string, newName: string) => {
    await renameDriveItem({ variables: { path, newName } });
  };

  const deleteItem = async (path: string) => {
    await deleteDriveItem({ variables: { path } });
  };

  const shareItem = async ({
    path,
    userWorkspaceId,
    accessLevel,
  }: {
    path: string;
    userWorkspaceId: string;
    accessLevel: DriveAccessLevel;
  }) => {
    await shareDriveItem({
      variables: { path, userWorkspaceId, accessLevel },
    });
  };

  return {
    createFolder,
    uploadFile,
    renameItem,
    deleteItem,
    shareItem,
  };
};

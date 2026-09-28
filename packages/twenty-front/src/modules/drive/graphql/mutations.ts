import { gql } from '@apollo/client';

export const CREATE_DRIVE_FOLDER = gql`
  mutation CreateDriveFolder($path: String!) {
    createDriveFolder(path: $path) {
      id
      name
      kind
      virtualPath
    }
  }
`;

export const CREATE_DRIVE_FILE_UPLOAD = gql`
  mutation CreateDriveFileUpload($path: String!, $size: Float!) {
    createDriveFileUpload(path: $path, size: $size) {
      fileId
      uploadUrl
      contentType
      expiresAt
    }
  }
`;

export const COMPLETE_DRIVE_FILE_UPLOAD = gql`
  mutation CompleteDriveFileUpload($fileId: UUID!) {
    completeDriveFileUpload(fileId: $fileId) {
      id
      name
      kind
      virtualPath
      downloadUrl
    }
  }
`;

export const RENAME_DRIVE_ITEM = gql`
  mutation RenameDriveItem($path: String!, $newName: String!) {
    renameDriveItem(path: $path, newName: $newName) {
      id
      name
      virtualPath
    }
  }
`;

export const DELETE_DRIVE_ITEM = gql`
  mutation DeleteDriveItem($path: String!) {
    deleteDriveItem(path: $path)
  }
`;

export const SHARE_DRIVE_ITEM = gql`
  mutation ShareDriveItem(
    $path: String!
    $userWorkspaceId: UUID!
    $accessLevel: DriveAccessLevel!
  ) {
    shareDriveItem(
      path: $path
      userWorkspaceId: $userWorkspaceId
      accessLevel: $accessLevel
    ) {
      id
      itemId
      userWorkspaceId
      accessLevel
    }
  }
`;

export const UNSHARE_DRIVE_ITEM = gql`
  mutation UnshareDriveItem($path: String!, $userWorkspaceId: UUID!) {
    unshareDriveItem(path: $path, userWorkspaceId: $userWorkspaceId)
  }
`;

export const UPSERT_DRIVE_SPACE_GRANTS = gql`
  mutation UpsertDriveSpaceGrants(
    $roleId: UUID!
    $grants: [UpsertDriveSpaceGrantInput!]!
  ) {
    upsertDriveSpaceGrants(roleId: $roleId, grants: $grants) {
      id
      spaceId
      roleId
      accessLevel
    }
  }
`;

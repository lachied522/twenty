import { gql } from '@apollo/client';

export const LIST_DRIVE_SPACES = gql`
  query ListDriveSpaces {
    listDriveSpaces {
      id
      listKind
      kind
      name
      slug
      icon
      virtualPath
      accessLevel
      ownerUserWorkspaceId
    }
  }
`;

export const LIST_DRIVE_ITEMS = gql`
  query ListDriveItems($path: String!) {
    listDriveItems(path: $path) {
      id
      name
      kind
      virtualPath
      accessLevel
      mimeType
      size
      downloadUrl
      parentId
      spaceId
      createdAt
      updatedAt
    }
  }
`;

export const STAT_DRIVE_ITEM = gql`
  query StatDriveItem($path: String!) {
    statDriveItem(path: $path) {
      id
      name
      kind
      virtualPath
      accessLevel
      mimeType
      size
      downloadUrl
      parentId
      spaceId
      createdAt
      updatedAt
    }
  }
`;

export const LIST_ORGANISATION_DRIVE_SPACES = gql`
  query ListOrganisationDriveSpaces {
    listOrganisationDriveSpaces {
      id
      name
      slug
      icon
      virtualPath
    }
  }
`;

export const LIST_DRIVE_SPACE_GRANTS = gql`
  query ListDriveSpaceGrants($roleId: UUID!) {
    listDriveSpaceGrants(roleId: $roleId) {
      id
      spaceId
      roleId
      accessLevel
    }
  }
`;

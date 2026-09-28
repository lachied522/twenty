export type DriveAccessLevel = 'READ' | 'READ_WRITE';

export type DriveItemKind = 'FILE' | 'FOLDER';

export type DriveSpaceListKind = 'PERSONAL' | 'ORGANISATION' | 'SHARED_WITH_ME';

export type DriveSpace = {
  id: string;
  listKind: DriveSpaceListKind;
  kind?: 'PERSONAL' | 'ORGANISATION' | null;
  name: string;
  slug: string;
  icon?: string | null;
  virtualPath: string;
  accessLevel: DriveAccessLevel;
  ownerUserWorkspaceId?: string | null;
};

export type DriveItem = {
  id: string;
  name: string;
  kind: DriveItemKind;
  virtualPath: string;
  accessLevel: DriveAccessLevel;
  mimeType?: string | null;
  size?: number | null;
  downloadUrl?: string | null;
  parentId?: string | null;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type DriveSpaceGrant = {
  id: string;
  spaceId: string;
  roleId: string;
  accessLevel: DriveAccessLevel;
};

export type DriveSpaceGrantDraftLevel = DriveAccessLevel | 'NONE';

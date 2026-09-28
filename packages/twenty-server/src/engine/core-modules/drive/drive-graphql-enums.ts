import { registerEnumType } from '@nestjs/graphql';

export const DriveAccessLevelEnum = {
  READ: 'READ',
  READ_WRITE: 'READ_WRITE',
} as const;

export const DriveSpaceKindEnum = {
  PERSONAL: 'PERSONAL',
  ORGANISATION: 'ORGANISATION',
} as const;

export const DriveItemKindEnum = {
  FILE: 'FILE',
  FOLDER: 'FOLDER',
} as const;

export const DrivePrincipalTypeEnum = {
  ROLE: 'ROLE',
  WORKSPACE_MEMBER: 'WORKSPACE_MEMBER',
} as const;

export const DriveSpaceListEntryKindEnum = {
  PERSONAL: 'PERSONAL',
  ORGANISATION: 'ORGANISATION',
  SHARED_WITH_ME: 'SHARED_WITH_ME',
} as const;

registerEnumType(DriveAccessLevelEnum, {
  name: 'DriveAccessLevel',
});

registerEnumType(DriveSpaceKindEnum, {
  name: 'DriveSpaceKind',
});

registerEnumType(DriveItemKindEnum, {
  name: 'DriveItemKind',
});

registerEnumType(DrivePrincipalTypeEnum, {
  name: 'DrivePrincipalType',
});

registerEnumType(DriveSpaceListEntryKindEnum, {
  name: 'DriveSpaceListEntryKind',
});

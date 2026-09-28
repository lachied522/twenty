export const DRIVE_SPACE_KINDS = ['PERSONAL', 'ORGANISATION'] as const;

export type DriveSpaceKind = (typeof DRIVE_SPACE_KINDS)[number];

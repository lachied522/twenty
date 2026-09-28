export const DRIVE_ACCESS_LEVELS = ['READ', 'READ_WRITE'] as const;

export type DriveAccessLevel = (typeof DRIVE_ACCESS_LEVELS)[number];

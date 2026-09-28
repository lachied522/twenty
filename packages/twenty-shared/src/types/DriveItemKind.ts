export const DRIVE_ITEM_KINDS = ['FILE', 'FOLDER'] as const;

export type DriveItemKind = (typeof DRIVE_ITEM_KINDS)[number];

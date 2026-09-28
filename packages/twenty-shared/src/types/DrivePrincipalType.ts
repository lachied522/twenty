export const DRIVE_PRINCIPAL_TYPES = ['ROLE', 'WORKSPACE_MEMBER'] as const;

export type DrivePrincipalType = (typeof DRIVE_PRINCIPAL_TYPES)[number];

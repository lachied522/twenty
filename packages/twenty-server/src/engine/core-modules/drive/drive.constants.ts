export const DRIVE_NOT_FOUND_MESSAGE = 'File not found';

export const DRIVE_SEEDED_ORGANISATION_SPACES = [
  {
    name: 'Finance',
    slug: 'finance',
    icon: 'IconCurrencyDollar',
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    icon: 'IconSpeakerphone',
  },
  {
    name: 'General',
    slug: 'general',
    icon: 'IconFiles',
  },
] as const;

export const DRIVE_PERSONAL_VIRTUAL_PREFIX = 'personal';
export const DRIVE_SPACES_VIRTUAL_PREFIX = 'spaces';
export const DRIVE_SHARED_VIRTUAL_PREFIX = 'shared';

export const DRIVE_SANDBOX_TOKEN_EXPIRES_IN = '8h';

export const DRIVE_NIL_PARENT_ID = '00000000-0000-0000-0000-000000000000';

export const DRIVE_MAX_TEXT_BYTES = 1_000_000;

export const DRIVE_MAX_SANDBOX_BYTES = 52_428_800;

export const DRIVE_MAX_ITEM_NAME_LENGTH = 255;

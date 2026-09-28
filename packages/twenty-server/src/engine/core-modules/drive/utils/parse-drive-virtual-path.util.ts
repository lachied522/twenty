import { isNonEmptyString } from '@sniptt/guards';

import {
  DRIVE_PERSONAL_VIRTUAL_PREFIX,
  DRIVE_SHARED_VIRTUAL_PREFIX,
  DRIVE_SPACES_VIRTUAL_PREFIX,
} from 'src/engine/core-modules/drive/drive.constants';
import {
  DriveException,
  DriveExceptionCode,
} from 'src/engine/core-modules/drive/drive.exception';

export type ParsedDriveVirtualPath =
  | {
      prefix: 'personal';
      restSegments: string[];
    }
  | {
      prefix: 'organisation';
      slug: string;
      restSegments: string[];
    }
  | {
      prefix: 'shared-root';
    }
  | {
      prefix: 'shared';
      itemId: string;
      restSegments: string[];
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseDriveVirtualPath = (
  rawPath: string,
): ParsedDriveVirtualPath => {
  if (!isNonEmptyString(rawPath) || rawPath[0] !== '/') {
    throw new DriveException(
      'Drive path must be an absolute virtual path',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  const segments = rawPath.split('/').filter(isNonEmptyString);

  if (segments.length === 0) {
    throw new DriveException(
      'Drive path must start with /personal, /spaces, or /shared',
      DriveExceptionCode.BAD_REQUEST,
    );
  }

  const [firstSegment, ...remainingSegments] = segments;

  if (firstSegment === DRIVE_PERSONAL_VIRTUAL_PREFIX) {
    return {
      prefix: 'personal',
      restSegments: remainingSegments,
    };
  }

  if (firstSegment === DRIVE_SPACES_VIRTUAL_PREFIX) {
    const [slug, ...organisationRestSegments] = remainingSegments;

    if (!isNonEmptyString(slug)) {
      throw new DriveException(
        'Organisation Drive path must be /spaces/{slug}/…',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    return {
      prefix: 'organisation',
      slug,
      restSegments: organisationRestSegments,
    };
  }

  if (firstSegment === DRIVE_SHARED_VIRTUAL_PREFIX) {
    if (remainingSegments.length === 0) {
      return { prefix: 'shared-root' };
    }

    const [itemId, ...sharedRestSegments] = remainingSegments;

    if (!UUID_PATTERN.test(itemId)) {
      throw new DriveException(
        'Shared Drive path must be /shared/{itemId}/…',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    return {
      prefix: 'shared',
      itemId,
      restSegments: sharedRestSegments,
    };
  }

  throw new DriveException(
    'Drive path must start with /personal, /spaces, or /shared',
    DriveExceptionCode.BAD_REQUEST,
  );
};

export const joinDriveVirtualPath = (segments: string[]): string =>
  `/${segments.filter(isNonEmptyString).join('/')}`;

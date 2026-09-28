import { type DriveAccessLevel } from 'twenty-shared/types';

const DRIVE_ACCESS_LEVEL_RANK: Record<DriveAccessLevel, number> = {
  READ: 1,
  READ_WRITE: 2,
};

export const isDriveAccessAtLeast = ({
  actualAccessLevel,
  requiredAccessLevel,
}: {
  actualAccessLevel: DriveAccessLevel;
  requiredAccessLevel: DriveAccessLevel;
}): boolean =>
  DRIVE_ACCESS_LEVEL_RANK[actualAccessLevel] >=
  DRIVE_ACCESS_LEVEL_RANK[requiredAccessLevel];

export const maxDriveAccessLevel = (
  accessLevels: DriveAccessLevel[],
): DriveAccessLevel | null => {
  if (accessLevels.length === 0) {
    return null;
  }

  return accessLevels.reduce((highestAccessLevel, accessLevel) =>
    isDriveAccessAtLeast({
      actualAccessLevel: accessLevel,
      requiredAccessLevel: highestAccessLevel,
    })
      ? accessLevel
      : highestAccessLevel,
  );
};

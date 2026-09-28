import { Field, ObjectType } from '@nestjs/graphql';

import { type DriveAccessLevel } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { DriveAccessLevelEnum } from 'src/engine/core-modules/drive/drive-graphql-enums';

@ObjectType('DriveSpaceGrant')
export class DriveSpaceGrantDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => UUIDScalarType)
  spaceId: string;

  @Field(() => UUIDScalarType)
  roleId: string;

  @Field(() => DriveAccessLevelEnum)
  accessLevel: DriveAccessLevel;
}

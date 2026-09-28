import { Field, ObjectType } from '@nestjs/graphql';

import { type DriveAccessLevel } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { DriveAccessLevelEnum } from 'src/engine/core-modules/drive/drive-graphql-enums';

@ObjectType('DriveItemShare')
export class DriveItemShareDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => UUIDScalarType)
  itemId: string;

  @Field(() => UUIDScalarType)
  userWorkspaceId: string;

  @Field(() => DriveAccessLevelEnum)
  accessLevel: DriveAccessLevel;

  @Field(() => Date)
  createdAt: Date;
}

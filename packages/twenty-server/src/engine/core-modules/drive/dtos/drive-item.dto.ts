import { Field, ObjectType } from '@nestjs/graphql';

import { type DriveAccessLevel, type DriveItemKind } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import {
  DriveAccessLevelEnum,
  DriveItemKindEnum,
} from 'src/engine/core-modules/drive/drive-graphql-enums';

@ObjectType('DriveItem')
export class DriveItemDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  name: string;

  @Field(() => DriveItemKindEnum)
  kind: DriveItemKind;

  @Field()
  virtualPath: string;

  @Field(() => DriveAccessLevelEnum)
  accessLevel: DriveAccessLevel;

  @Field(() => String, { nullable: true })
  mimeType?: string | null;

  @Field(() => Number, { nullable: true })
  size?: number | null;

  @Field(() => String, { nullable: true })
  downloadUrl?: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  parentId?: string | null;

  @Field(() => UUIDScalarType)
  spaceId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

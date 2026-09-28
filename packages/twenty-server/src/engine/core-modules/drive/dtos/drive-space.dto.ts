import { Field, ObjectType } from '@nestjs/graphql';

import {
  type DriveAccessLevel,
  type DriveSpaceKind,
} from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import {
  DriveAccessLevelEnum,
  DriveSpaceKindEnum,
  DriveSpaceListEntryKindEnum,
} from 'src/engine/core-modules/drive/drive-graphql-enums';

@ObjectType('DriveSpace')
export class DriveSpaceDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => DriveSpaceListEntryKindEnum)
  listKind: keyof typeof DriveSpaceListEntryKindEnum;

  @Field(() => DriveSpaceKindEnum, { nullable: true })
  kind?: DriveSpaceKind | null;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => String, { nullable: true })
  icon?: string | null;

  @Field()
  virtualPath: string;

  @Field(() => DriveAccessLevelEnum)
  accessLevel: DriveAccessLevel;

  @Field(() => UUIDScalarType, { nullable: true })
  ownerUserWorkspaceId?: string | null;
}

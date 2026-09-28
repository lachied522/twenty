import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsUUID, IsString } from 'class-validator';

import { type DriveAccessLevel } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { DriveAccessLevelEnum } from 'src/engine/core-modules/drive/drive-graphql-enums';

@InputType()
export class UpsertDriveSpaceGrantInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  spaceId: string;

  @Field(() => DriveAccessLevelEnum, { nullable: true })
  @IsOptional()
  @IsString()
  accessLevel?: DriveAccessLevel | null;
}

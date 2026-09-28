import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsUUID } from 'class-validator';
import { type DriveAccessLevel, type DrivePrincipalType } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import {
  DriveAccessLevelEnum,
  DrivePrincipalTypeEnum,
} from 'src/engine/core-modules/drive/drive-graphql-enums';

@InputType()
export class ShareSkillInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  skillId: string;

  @Field(() => DrivePrincipalTypeEnum)
  principalType: DrivePrincipalType;

  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  principalId: string;

  @Field(() => DriveAccessLevelEnum)
  accessLevel: DriveAccessLevel;
}

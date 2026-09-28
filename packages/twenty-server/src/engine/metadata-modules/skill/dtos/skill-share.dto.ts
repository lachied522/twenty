import { Field, ObjectType } from '@nestjs/graphql';

import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';
import { type DriveAccessLevel, type DrivePrincipalType } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import {
  DriveAccessLevelEnum,
  DrivePrincipalTypeEnum,
} from 'src/engine/core-modules/drive/drive-graphql-enums';

@ObjectType('SkillShare')
export class SkillShareDTO {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

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

  @IsDateString()
  @Field()
  createdAt: Date;

  @IsDateString()
  @Field()
  updatedAt: Date;
}

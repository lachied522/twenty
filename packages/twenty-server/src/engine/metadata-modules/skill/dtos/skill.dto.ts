import { Field, HideField, ObjectType, registerEnumType } from '@nestjs/graphql';

import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { type SkillKind } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export const SkillKindEnum = {
  SYSTEM: 'SYSTEM',
  WORKSPACE: 'WORKSPACE',
  USER: 'USER',
  GIZMO: 'GIZMO',
} as const;

registerEnumType(SkillKindEnum, {
  name: 'SkillKind',
});

@ObjectType('Skill')
export class SkillDTO {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @Field()
  name: string;

  @IsString()
  @Field()
  label: string;

  @IsString()
  @Field({ nullable: true })
  icon?: string;

  @IsString()
  @Field({ nullable: true })
  description?: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  content: string;

  @IsBoolean()
  @Field()
  isCustom: boolean;

  @IsBoolean()
  @Field()
  isSystem: boolean;

  @IsBoolean()
  @Field()
  isHidden: boolean;

  @Field(() => SkillKindEnum)
  kind: SkillKind;

  @IsUUID()
  @IsOptional()
  @Field(() => UUIDScalarType, { nullable: true })
  ownerUserWorkspaceId?: string | null;

  @Field(() => [String], { nullable: true })
  toolkitSlugs?: string[] | null;

  @IsBoolean()
  @Field()
  isActive: boolean;

  @HideField()
  workspaceId: string;

  @Field(() => UUIDScalarType, { nullable: true })
  applicationId?: string;

  @IsDateString()
  @Field()
  createdAt: Date;

  @IsDateString()
  @Field()
  updatedAt: Date;
}

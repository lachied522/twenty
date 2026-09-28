import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

export enum ComposioToolkitConnectionStatusEnum {
  connected = 'connected',
  needs_reauth = 'needs_reauth',
  not_connected = 'not_connected',
}

export enum ComposioAccountStatusEnum {
  active = 'active',
  needs_reauth = 'needs_reauth',
  inactive = 'inactive',
  pending = 'pending',
}

registerEnumType(ComposioToolkitConnectionStatusEnum, {
  name: 'ComposioToolkitConnectionStatus',
});

registerEnumType(ComposioAccountStatusEnum, {
  name: 'ComposioAccountStatus',
});

@ObjectType('ComposioConnectField')
export class ComposioConnectFieldDTO {
  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field()
  description: string;

  @Field()
  required: boolean;

  @Field()
  type: string;
}

@ObjectType('ComposioAccount')
export class ComposioAccountDTO {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  alias: string | null;

  @Field(() => ComposioAccountStatusEnum)
  status: ComposioAccountStatusEnum;

  @Field()
  rawStatus: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

@ObjectType('ComposioToolkitSummary')
export class ComposioToolkitSummaryDTO {
  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  logo: string | null;

  @Field()
  noAuth: boolean;

  @Field(() => ComposioToolkitConnectionStatusEnum)
  status: ComposioToolkitConnectionStatusEnum;

  @Field()
  accountCount: number;
}

@ObjectType('ComposioToolkitList')
export class ComposioToolkitListDTO {
  @Field(() => [ComposioToolkitSummaryDTO])
  items: ComposioToolkitSummaryDTO[];

  @Field(() => String, { nullable: true })
  nextCursor: string | null;
}

@ObjectType('ComposioToolkitCategory')
export class ComposioToolkitCategoryDTO {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  toolkitCount: number;
}

@ObjectType('ComposioToolkitCategoryList')
export class ComposioToolkitCategoryListDTO {
  @Field()
  totalCount: number;

  @Field(() => [ComposioToolkitCategoryDTO])
  categories: ComposioToolkitCategoryDTO[];
}

@ObjectType('ComposioToolkitDetail')
export class ComposioToolkitDetailDTO {
  @Field()
  slug: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  logo: string | null;

  @Field()
  noAuth: boolean;

  @Field(() => ComposioToolkitConnectionStatusEnum)
  status: ComposioToolkitConnectionStatusEnum;

  @Field(() => String, { nullable: true })
  authConfigId: string | null;

  @Field()
  connectMode: string;

  @Field(() => [ComposioConnectFieldDTO])
  connectFields: ComposioConnectFieldDTO[];

  @Field(() => String, { nullable: true })
  configurationError: string | null;

  @Field(() => [ComposioAccountDTO])
  accounts: ComposioAccountDTO[];
}

@ObjectType('ComposioConnectResult')
export class ComposioConnectResultDTO {
  @Field(() => String, { nullable: true })
  redirectUrl: string | null;

  @Field()
  connectedAccountId: string;

  @Field(() => ComposioAccountDTO, { nullable: true })
  account?: ComposioAccountDTO | null;
}

@ObjectType('ComposioRefreshResult')
export class ComposioRefreshResultDTO {
  @Field(() => String, { nullable: true })
  redirectUrl: string | null;

  @Field()
  connectedAccountId: string;
}

@ObjectType('ComposioAccountAliasResult')
export class ComposioAccountAliasResultDTO {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  alias: string | null;
}

@InputType()
export class ConnectComposioToolkitInput {
  @Field()
  toolkitSlug: string;

  @Field()
  callbackUrl: string;

  @Field(() => String, { nullable: true })
  alias?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  credentials?: Record<string, string> | null;
}

@InputType()
export class RefreshComposioAccountInput {
  @Field()
  accountId: string;

  @Field()
  redirectUrl: string;
}

@InputType()
export class UpdateComposioAccountAliasInput {
  @Field()
  accountId: string;

  @Field()
  alias: string;
}

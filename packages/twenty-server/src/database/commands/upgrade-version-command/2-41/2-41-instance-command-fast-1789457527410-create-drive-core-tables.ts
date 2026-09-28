import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.41.0', 1789457527410)
export class CreateDriveCoreTablesFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."driveSpace_kind_enum" AS ENUM ('PERSONAL', 'ORGANISATION'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."driveItem_kind_enum" AS ENUM ('FILE', 'FOLDER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."driveSpaceGrant_principalType_enum" AS ENUM ('ROLE', 'WORKSPACE_MEMBER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."driveSpaceGrant_accessLevel_enum" AS ENUM ('READ', 'READ_WRITE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."driveItemShare_accessLevel_enum" AS ENUM ('READ', 'READ_WRITE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."driveSpace" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "kind" "core"."driveSpace_kind_enum" NOT NULL,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "icon" character varying,
        "pathPrefix" character varying NOT NULL,
        "ownerUserWorkspaceId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_driveSpace_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_DRIVE_SPACE_WORKSPACE_ID" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_SPACE_OWNER_USER_WORKSPACE_ID" FOREIGN KEY ("ownerUserWorkspaceId")
          REFERENCES "core"."userWorkspace"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_WORKSPACE_ID" ON "core"."driveSpace" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_OWNER_USER_WORKSPACE_ID" ON "core"."driveSpace" ("ownerUserWorkspaceId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_WORKSPACE_SLUG_ORGANISATION_UNIQUE"
        ON "core"."driveSpace" ("workspaceId", "slug")
        WHERE "kind" = 'ORGANISATION' AND "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_OWNER_PERSONAL_UNIQUE"
        ON "core"."driveSpace" ("workspaceId", "ownerUserWorkspaceId")
        WHERE "kind" = 'PERSONAL' AND "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."driveItem" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "spaceId" uuid NOT NULL,
        "parentId" uuid,
        "name" character varying NOT NULL,
        "kind" "core"."driveItem_kind_enum" NOT NULL,
        "fileId" uuid,
        "mimeType" character varying,
        "size" bigint,
        "createdByUserWorkspaceId" uuid,
        "updatedByUserWorkspaceId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_driveItem_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_DRIVE_ITEM_WORKSPACE_ID" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_ITEM_SPACE_ID" FOREIGN KEY ("spaceId")
          REFERENCES "core"."driveSpace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_ITEM_PARENT_ID" FOREIGN KEY ("parentId")
          REFERENCES "core"."driveItem"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_ITEM_FILE_ID" FOREIGN KEY ("fileId")
          REFERENCES "core"."file"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_DRIVE_ITEM_CREATED_BY_USER_WORKSPACE_ID" FOREIGN KEY ("createdByUserWorkspaceId")
          REFERENCES "core"."userWorkspace"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_DRIVE_ITEM_UPDATED_BY_USER_WORKSPACE_ID" FOREIGN KEY ("updatedByUserWorkspaceId")
          REFERENCES "core"."userWorkspace"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_WORKSPACE_ID" ON "core"."driveItem" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_SPACE_ID" ON "core"."driveItem" ("spaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_PARENT_ID" ON "core"."driveItem" ("parentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_FILE_ID" ON "core"."driveItem" ("fileId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_SPACE_PARENT_NAME_UNIQUE"
        ON "core"."driveItem" ("spaceId", COALESCE("parentId", '00000000-0000-0000-0000-000000000000'), "name")
        WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."driveSpaceGrant" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "spaceId" uuid NOT NULL,
        "principalType" "core"."driveSpaceGrant_principalType_enum" NOT NULL,
        "principalId" uuid NOT NULL,
        "accessLevel" "core"."driveSpaceGrant_accessLevel_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_driveSpaceGrant_id" PRIMARY KEY ("id"),
        CONSTRAINT "IDX_DRIVE_SPACE_GRANT_SPACE_PRINCIPAL_UNIQUE" UNIQUE ("spaceId", "principalType", "principalId"),
        CONSTRAINT "FK_DRIVE_SPACE_GRANT_WORKSPACE_ID" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_SPACE_GRANT_SPACE_ID" FOREIGN KEY ("spaceId")
          REFERENCES "core"."driveSpace"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_GRANT_WORKSPACE_ID" ON "core"."driveSpaceGrant" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_SPACE_GRANT_PRINCIPAL" ON "core"."driveSpaceGrant" ("principalType", "principalId")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."driveItemShare" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        "userWorkspaceId" uuid NOT NULL,
        "accessLevel" "core"."driveItemShare_accessLevel_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_driveItemShare_id" PRIMARY KEY ("id"),
        CONSTRAINT "IDX_DRIVE_ITEM_SHARE_ITEM_USER_WORKSPACE_UNIQUE" UNIQUE ("itemId", "userWorkspaceId"),
        CONSTRAINT "FK_DRIVE_ITEM_SHARE_WORKSPACE_ID" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_ITEM_SHARE_ITEM_ID" FOREIGN KEY ("itemId")
          REFERENCES "core"."driveItem"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_DRIVE_ITEM_SHARE_USER_WORKSPACE_ID" FOREIGN KEY ("userWorkspaceId")
          REFERENCES "core"."userWorkspace"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_SHARE_WORKSPACE_ID" ON "core"."driveItemShare" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DRIVE_ITEM_SHARE_USER_WORKSPACE_ID" ON "core"."driveItemShare" ("userWorkspaceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."driveItemShare"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."driveSpaceGrant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."driveItem"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."driveSpace"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."driveItemShare_accessLevel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."driveSpaceGrant_accessLevel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."driveSpaceGrant_principalType_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "core"."driveItem_kind_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "core"."driveSpace_kind_enum"`);
  }
}

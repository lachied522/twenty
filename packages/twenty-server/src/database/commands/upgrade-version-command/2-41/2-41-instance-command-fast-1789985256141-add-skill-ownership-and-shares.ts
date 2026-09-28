import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.41.0', 1789985256141)
export class AddSkillOwnershipAndSharesFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."skill_kind_enum" AS ENUM ('SYSTEM', 'WORKSPACE', 'USER', 'GIZMO'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."skillShare_principalType_enum" AS ENUM ('ROLE', 'WORKSPACE_MEMBER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "core"."skillShare_accessLevel_enum" AS ENUM ('READ', 'READ_WRITE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(
      `ALTER TABLE "core"."skill" ADD COLUMN IF NOT EXISTS "kind" "core"."skill_kind_enum" NOT NULL DEFAULT 'WORKSPACE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" ADD COLUMN IF NOT EXISTS "ownerUserWorkspaceId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" ADD COLUMN IF NOT EXISTS "toolkitSlugs" text[]`,
    );

    await queryRunner.query(
      `UPDATE "core"."skill" SET "kind" = 'SYSTEM' WHERE "isSystem" = true`,
    );
    await queryRunner.query(
      `UPDATE "core"."skill" SET "kind" = 'WORKSPACE' WHERE "isSystem" = false AND "kind" = 'WORKSPACE'`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "core"."skill"
          ADD CONSTRAINT "FK_SKILL_OWNER_USER_WORKSPACE_ID"
          FOREIGN KEY ("ownerUserWorkspaceId")
          REFERENCES "core"."userWorkspace"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SKILL_OWNER_USER_WORKSPACE_ID"
        ON "core"."skill" ("ownerUserWorkspaceId")`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_SKILL_NAME_WORKSPACE_ID_UNIQUE"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_SKILL_NAME_WORKSPACE_ID_NULL_OWNER_UNIQUE"
        ON "core"."skill" ("workspaceId", "name")
        WHERE "isActive" = true AND "ownerUserWorkspaceId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_SKILL_NAME_WORKSPACE_ID_OWNER_UNIQUE"
        ON "core"."skill" ("workspaceId", "ownerUserWorkspaceId", "name")
        WHERE "isActive" = true AND "ownerUserWorkspaceId" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "core"."skillShare" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        "principalType" "core"."skillShare_principalType_enum" NOT NULL,
        "principalId" uuid NOT NULL,
        "accessLevel" "core"."skillShare_accessLevel_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_skillShare_id" PRIMARY KEY ("id"),
        CONSTRAINT "IDX_SKILL_SHARE_SKILL_PRINCIPAL_UNIQUE" UNIQUE ("skillId", "principalType", "principalId"),
        CONSTRAINT "FK_SKILL_SHARE_WORKSPACE_ID" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_SKILL_SHARE_SKILL_ID" FOREIGN KEY ("skillId")
          REFERENCES "core"."skill"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SKILL_SHARE_WORKSPACE_ID" ON "core"."skillShare" ("workspaceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SKILL_SHARE_PRINCIPAL" ON "core"."skillShare" ("principalType", "principalId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."skillShare"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."skillShare_accessLevel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."skillShare_principalType_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_SKILL_NAME_WORKSPACE_ID_OWNER_UNIQUE"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_SKILL_NAME_WORKSPACE_ID_NULL_OWNER_UNIQUE"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_SKILL_NAME_WORKSPACE_ID_UNIQUE"
        ON "core"."skill" ("name", "workspaceId")
        WHERE "isActive" = true`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_SKILL_OWNER_USER_WORKSPACE_ID"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" DROP CONSTRAINT IF EXISTS "FK_SKILL_OWNER_USER_WORKSPACE_ID"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" DROP COLUMN IF EXISTS "toolkitSlugs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" DROP COLUMN IF EXISTS "ownerUserWorkspaceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."skill" DROP COLUMN IF EXISTS "kind"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "core"."skill_kind_enum"`);
  }
}

import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.41.0', 1789988082553)
export class AddIsHiddenToSkillFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."skill" ADD COLUMN IF NOT EXISTS "isHidden" boolean NOT NULL DEFAULT false`,
    );
    // Agent-facing system skills stay out of user skill lists
    await queryRunner.query(
      `UPDATE "core"."skill" SET "isHidden" = true WHERE "isSystem" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."skill" DROP COLUMN IF EXISTS "isHidden"`,
    );
  }
}

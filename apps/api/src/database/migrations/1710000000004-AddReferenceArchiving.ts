import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferenceArchiving1710000000004 implements MigrationInterface {
  name = 'AddReferenceArchiving1710000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "accounts" ADD "archived_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "archived_at" TIMESTAMPTZ`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_accounts_active_user_name_ci" ON "accounts" ("user_id", lower("name")) WHERE "archived_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_categories_active_user_name_kind_ci" ON "categories" ("user_id", lower("name"), "kind") WHERE "archived_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_user_archived" ON "accounts" ("user_id", "archived_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_user_archived" ON "categories" ("user_id", "archived_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_categories_user_archived"`);
    await queryRunner.query(`DROP INDEX "IDX_accounts_user_archived"`);
    await queryRunner.query(`DROP INDEX "UQ_categories_active_user_name_kind_ci"`);
    await queryRunner.query(`DROP INDEX "UQ_accounts_active_user_name_ci"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "archived_at"`);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "archived_at"`);
  }
}

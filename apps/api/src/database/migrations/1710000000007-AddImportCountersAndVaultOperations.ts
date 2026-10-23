import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportCountersAndVaultOperations1710000000007 implements MigrationInterface {
  name = 'AddImportCountersAndVaultOperations1710000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "import_jobs" ADD "created_count" integer NOT NULL DEFAULT 0, ADD "skipped_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "vault_events" ADD "operation_id" varchar(120)`);
    await queryRunner.query(
      `UPDATE "vault_events" SET "operation_id" = 'legacy:' || "id" WHERE "operation_id" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "vault_events" ALTER COLUMN "operation_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "vault_events" DROP CONSTRAINT "UQ_vault_events_user_transaction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vault_events" ADD CONSTRAINT "UQ_vault_events_user_operation" UNIQUE ("user_id", "operation_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vault_events" DROP CONSTRAINT "UQ_vault_events_user_operation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vault_events" ADD CONSTRAINT "UQ_vault_events_user_transaction" UNIQUE ("user_id", "transaction_id")`,
    );
    await queryRunner.query(`ALTER TABLE "vault_events" DROP COLUMN "operation_id"`);
    await queryRunner.query(
      `ALTER TABLE "import_jobs" DROP COLUMN "created_count", DROP COLUMN "skipped_count"`,
    );
  }
}

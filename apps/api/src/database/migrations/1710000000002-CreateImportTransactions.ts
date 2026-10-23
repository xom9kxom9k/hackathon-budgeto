import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImportTransactions1710000000002 implements MigrationInterface {
  name = 'CreateImportTransactions1710000000002';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "category_kind_enum" AS ENUM ('income', 'expense')`);
    await queryRunner.query(
      `CREATE TYPE "transaction_kind_enum" AS ENUM ('income', 'expense', 'transfer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "import_job_status_enum" AS ENUM ('queued', 'parsing', 'preview', 'confirmed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "name" varchar(160) NOT NULL, "kind" "category_kind_enum" NOT NULL, CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_categories_user_name_kind" UNIQUE ("user_id", "name", "kind"), CONSTRAINT "FK_categories_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_categories_user_id" ON "categories" ("user_id")`);
    await queryRunner.query(
      `CREATE TABLE "import_jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "file_name" varchar(255) NOT NULL, "file_path" varchar(500) NOT NULL, "status" "import_job_status_enum" NOT NULL DEFAULT 'queued', "preview" jsonb, "error_code" varchar(80), "confirmed_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_import_jobs_id" PRIMARY KEY ("id"), CONSTRAINT "FK_import_jobs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_import_jobs_user_created" ON "import_jobs" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "account_id" uuid NOT NULL, "destination_account_id" uuid, "category_id" uuid, "date" date NOT NULL, "kind" "transaction_kind_enum" NOT NULL, "amount" numeric(18,2) NOT NULL, "note" varchar(500), "fingerprint" varchar(64) NOT NULL, "import_job_id" uuid, "import_row" integer, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_transactions_user_fingerprint" UNIQUE ("user_id", "fingerprint"), CONSTRAINT "FK_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_transactions_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE, CONSTRAINT "FK_transactions_destination" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL, CONSTRAINT "FK_transactions_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL, CONSTRAINT "FK_transactions_import_job" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_date" ON "transactions" ("user_id", "date")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_transactions_user_date"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP INDEX "IDX_import_jobs_user_created"`);
    await queryRunner.query(`DROP TABLE "import_jobs"`);
    await queryRunner.query(`DROP INDEX "IDX_categories_user_id"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "import_job_status_enum"`);
    await queryRunner.query(`DROP TYPE "transaction_kind_enum"`);
    await queryRunner.query(`DROP TYPE "category_kind_enum"`);
  }
}

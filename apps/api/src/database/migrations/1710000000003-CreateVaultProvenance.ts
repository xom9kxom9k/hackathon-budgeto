import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVaultProvenance1710000000003 implements MigrationInterface {
  name = 'CreateVaultProvenance1710000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vault_keys" ("user_id" uuid NOT NULL, "public_key" text NOT NULL, "encrypted_private_key" jsonb NOT NULL, "key_version" integer NOT NULL DEFAULT 1, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_vault_keys_user_id" PRIMARY KEY ("user_id"), CONSTRAINT "FK_vault_keys_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE TABLE "vault_chain_heads" ("user_id" uuid NOT NULL, "sequence" bigint NOT NULL DEFAULT 0, "last_hash" varchar(64) NOT NULL, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_vault_chain_heads_user_id" PRIMARY KEY ("user_id"), CONSTRAINT "FK_vault_chain_heads_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE TABLE "vault_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "sequence" bigint NOT NULL, "event_type" varchar(80) NOT NULL, "transaction_id" uuid NOT NULL, "import_job_id" uuid, "import_row" integer, "ciphertext" text NOT NULL, "iv" varchar(24) NOT NULL, "auth_tag" varchar(24) NOT NULL, "key_version" integer NOT NULL, "payload_hash" varchar(64) NOT NULL, "fingerprint" varchar(64) NOT NULL, "claim_digest" varchar(64) NOT NULL, "signature" text NOT NULL, "public_key_id" varchar(64) NOT NULL, "previous_hash" varchar(64) NOT NULL, "event_hash" varchar(64) NOT NULL, "schema_version" integer NOT NULL DEFAULT 1, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_vault_events_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_vault_events_user_sequence" UNIQUE ("user_id", "sequence"), CONSTRAINT "UQ_vault_events_user_transaction" UNIQUE ("user_id", "transaction_id"), CONSTRAINT "FK_vault_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_vault_events_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT, CONSTRAINT "FK_vault_events_import_job" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vault_events_user_created" ON "vault_events" ("user_id", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_vault_events_user_created"`);
    await queryRunner.query(`DROP TABLE "vault_events"`);
    await queryRunner.query(`DROP TABLE "vault_chain_heads"`);
    await queryRunner.query(`DROP TABLE "vault_keys"`);
  }
}

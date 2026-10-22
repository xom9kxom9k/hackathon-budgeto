import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAndAccounts1710000000000 implements MigrationInterface {
  name = 'CreateAuthAndAccounts1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`
      CREATE TYPE "auth_challenges_purpose_enum" AS ENUM ('registration_totp', 'login_totp')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "password_hash" varchar NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "last_seen_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_user_id" ON "sessions" ("user_id")`);
    await queryRunner.query(`
      CREATE TABLE "totp_credentials" (
        "user_id" uuid NOT NULL,
        "secret_ciphertext" text NOT NULL,
        "secret_iv" varchar(24) NOT NULL,
        "secret_auth_tag" varchar(24) NOT NULL,
        "enabled_at" TIMESTAMPTZ,
        "last_used_step" bigint,
        CONSTRAINT "PK_totp_credentials_user_id" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_totp_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "recovery_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code_hash" varchar NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recovery_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recovery_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_codes_user_id" ON "recovery_codes" ("user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "purpose" "auth_challenges_purpose_enum" NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "consumed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_challenges_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_challenges_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_auth_challenges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_challenges_user_id" ON "auth_challenges" ("user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_accounts_user_id" ON "accounts" ("user_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_accounts_user_id"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP INDEX "IDX_auth_challenges_user_id"`);
    await queryRunner.query(`DROP TABLE "auth_challenges"`);
    await queryRunner.query(`DROP INDEX "IDX_recovery_codes_user_id"`);
    await queryRunner.query(`DROP TABLE "recovery_codes"`);
    await queryRunner.query(`DROP TABLE "totp_credentials"`);
    await queryRunner.query(`DROP INDEX "IDX_sessions_user_id"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "auth_challenges_purpose_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavingsGoals1710000000009 implements MigrationInterface {
  name = 'CreateSavingsGoals1710000000009';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "savings_goals" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "currency" varchar(3) NOT NULL,
      "name" varchar(80) NOT NULL,
      "target" numeric(18,2) NOT NULL CHECK ("target" > 0),
      "saved" numeric(18,2) NOT NULL DEFAULT 0 CHECK ("saved" >= 0),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("user_id", "currency")
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "savings_goals"');
  }
}

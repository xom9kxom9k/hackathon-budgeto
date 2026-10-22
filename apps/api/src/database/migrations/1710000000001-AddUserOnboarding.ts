import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserOnboarding1710000000001 implements MigrationInterface {
  name = 'AddUserOnboarding1710000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "display_name" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "goals" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "users" ADD "onboarding_completed_at" TIMESTAMPTZ`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_completed_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "goals"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);
  }
}

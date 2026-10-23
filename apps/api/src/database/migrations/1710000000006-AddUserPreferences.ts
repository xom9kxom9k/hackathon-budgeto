import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1710000000006 implements MigrationInterface {
  name = 'AddUserPreferences1710000000006';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "locale" varchar(5) NOT NULL DEFAULT 'ru'`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'UTC'`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locale"`);
  }
}

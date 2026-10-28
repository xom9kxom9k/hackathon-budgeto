import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportSourceHash1710000000008 implements MigrationInterface {
  name = 'AddImportSourceHash1710000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "import_jobs" ADD "source_sha256" varchar(64)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "import_jobs" DROP COLUMN "source_sha256"`);
  }
}

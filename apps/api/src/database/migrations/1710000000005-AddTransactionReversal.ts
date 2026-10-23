import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionReversal1710000000005 implements MigrationInterface {
  name = 'AddTransactionReversal1710000000005';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ADD "reversed_at" TIMESTAMPTZ`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "reversed_at"`);
  }
}

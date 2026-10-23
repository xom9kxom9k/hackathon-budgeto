import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TransactionKind {
  Income = 'income',
  Expense = 'expense',
  Transfer = 'transfer',
}

@Entity('transactions')
@Index(['userId', 'date'])
@Index(['userId', 'fingerprint'], { unique: true })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'account_id', type: 'uuid' }) accountId!: string;
  @Column({ name: 'destination_account_id', type: 'uuid', nullable: true }) destinationAccountId!:
    string | null;
  @Column({ name: 'category_id', type: 'uuid', nullable: true }) categoryId!: string | null;
  @Column({ type: 'date' }) date!: string;
  @Column({ type: 'enum', enum: TransactionKind }) kind!: TransactionKind;
  @Column({ type: 'numeric', precision: 18, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) note!: string | null;
  @Column({ type: 'varchar', length: 64 }) fingerprint!: string;
  @Column({ name: 'import_job_id', type: 'uuid', nullable: true }) importJobId!: string | null;
  @Column({ name: 'import_row', type: 'int', nullable: true }) importRow!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true }) reversedAt!: Date | null;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum VaultEventType {
  TransactionConfirmed = 'transaction_confirmed',
}

@Entity('vault_events')
@Index(['userId', 'sequence'], { unique: true })
@Index(['userId', 'transactionId'], { unique: true })
export class VaultEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'bigint' })
  sequence!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType!: VaultEventType;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'import_job_id', type: 'uuid', nullable: true })
  importJobId!: string | null;

  @Column({ name: 'import_row', type: 'int', nullable: true })
  importRow!: number | null;

  @Column({ type: 'text' })
  ciphertext!: string;

  @Column({ type: 'varchar', length: 24 })
  iv!: string;

  @Column({ name: 'auth_tag', type: 'varchar', length: 24 })
  authTag!: string;

  @Column({ name: 'key_version', type: 'int' })
  keyVersion!: number;

  @Column({ name: 'payload_hash', type: 'varchar', length: 64 })
  payloadHash!: string;

  @Column({ type: 'varchar', length: 64 })
  fingerprint!: string;

  @Column({ name: 'claim_digest', type: 'varchar', length: 64 })
  claimDigest!: string;

  @Column({ type: 'text' })
  signature!: string;

  @Column({ name: 'public_key_id', type: 'varchar', length: 64 })
  publicKeyId!: string;

  @Column({ name: 'previous_hash', type: 'varchar', length: 64 })
  previousHash!: string;

  @Column({ name: 'event_hash', type: 'varchar', length: 64 })
  eventHash!: string;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

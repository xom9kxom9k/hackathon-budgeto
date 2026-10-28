import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ImportJobStatus {
  Queued = 'queued',
  Parsing = 'parsing',
  Preview = 'preview',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

@Entity('import_jobs')
@Index(['userId', 'createdAt'])
export class ImportJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'file_name', type: 'varchar', length: 255 }) fileName!: string;
  @Column({ name: 'file_path', type: 'varchar', length: 500 }) filePath!: string;
  @Column({ name: 'source_sha256', type: 'varchar', length: 64, nullable: true })
  sourceSha256!: string | null;
  @Column({ type: 'enum', enum: ImportJobStatus, default: ImportJobStatus.Queued })
  status!: ImportJobStatus;
  @Column({ type: 'jsonb', nullable: true }) preview!: unknown;
  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true }) errorCode!:
    string | null;
  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true }) confirmedAt!: Date | null;
  @Column({ name: 'created_count', type: 'integer', default: 0 }) createdCount!: number;
  @Column({ name: 'skipped_count', type: 'integer', default: 0 }) skippedCount!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

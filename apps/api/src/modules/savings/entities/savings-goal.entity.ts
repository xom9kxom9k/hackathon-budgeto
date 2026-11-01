import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('savings_goals')
@Index(['userId', 'currency'], { unique: true })
export class SavingsGoalEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar', length: 3 }) currency!: string;
  @Column({ type: 'varchar', length: 80 }) name!: string;
  @Column({ type: 'numeric', precision: 18, scale: 2 }) target!: string;
  @Column({ type: 'numeric', precision: 18, scale: 2 }) saved!: string;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

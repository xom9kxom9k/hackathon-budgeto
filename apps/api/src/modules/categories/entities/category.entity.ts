import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum CategoryKind {
  Income = 'income',
  Expense = 'expense',
}

@Entity('categories')
@Unique(['userId', 'name', 'kind'])
@Index(['userId'])
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'enum', enum: CategoryKind }) kind!: CategoryKind;
}

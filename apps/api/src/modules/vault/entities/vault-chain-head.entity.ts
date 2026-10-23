import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('vault_chain_heads')
export class VaultChainHeadEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'bigint', default: 0 })
  sequence!: string;

  @Column({ name: 'last_hash', type: 'varchar', length: 64 })
  lastHash!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

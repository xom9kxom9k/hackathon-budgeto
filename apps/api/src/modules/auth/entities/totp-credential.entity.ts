import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { UserEntity } from './user.entity';

@Entity('totp_credentials')
export class TotpCredentialEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'secret_ciphertext', type: 'text' })
  secretCiphertext!: string;

  @Column({ name: 'secret_iv', type: 'varchar', length: 24 })
  secretIv!: string;

  @Column({ name: 'secret_auth_tag', type: 'varchar', length: 24 })
  secretAuthTag!: string;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt!: Date | null;

  @Column({ name: 'last_used_step', type: 'bigint', nullable: true })
  lastUsedStep!: string | null;
}

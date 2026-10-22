import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuthChallengePurpose {
  RegistrationTotp = 'registration_totp',
  LoginTotp = 'login_totp',
}

@Entity('auth_challenges')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
export class AuthChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: 'enum', enum: AuthChallengePurpose })
  purpose!: AuthChallengePurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

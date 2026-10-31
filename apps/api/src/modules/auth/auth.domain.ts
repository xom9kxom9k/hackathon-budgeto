import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { generateSecret, generateURI, verify } from 'otplib';
import { IsNull, Repository } from 'typeorm';

import { AuthChallengeEntity, AuthChallengePurpose } from './entities/auth-challenge.entity';
import { RecoveryCodeEntity } from './entities/recovery-code.entity';
import { TotpCredentialEntity } from './entities/totp-credential.entity';
import { UserEntity } from './entities/user.entity';

import { AuthCryptoService } from './auth.crypto';
import { AuthSessionService } from './auth.session';
import { AuthErrorCode, throwAuthError } from './auth.error-code';
import type {
  AuthSessionResult,
  AuthUserView,
  TotpConfirmationResult,
  TotpSetupResult,
} from './auth.types';

const challengeTtlMs = 10 * 60 * 1000;

@Injectable()
export class AuthDomainService {
  private readonly issuer: string;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(TotpCredentialEntity)
    private readonly totpCredentials: Repository<TotpCredentialEntity>,
    @InjectRepository(RecoveryCodeEntity)
    private readonly recoveryCodes: Repository<RecoveryCodeEntity>,
    @InjectRepository(AuthChallengeEntity)
    private readonly challenges: Repository<AuthChallengeEntity>,
    private readonly crypto: AuthCryptoService,
    private readonly sessions: AuthSessionService,
    config: ConfigService,
  ) {
    this.issuer = config.get<string>('AUTH_ISSUER') ?? 'Budgetto';
  }

  async register(email: string, password: string): Promise<TotpSetupResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.users.findOne({ where: { email: normalizedEmail } });

    if (existing) {
      throwAuthError(AuthErrorCode.EmailTaken, HttpStatus.CONFLICT);
    }

    const user = await this.users.save(
      this.users.create({
        email: normalizedEmail,
        passwordHash: await this.crypto.hashPassword(password),
      }),
    );
    const secret = generateSecret();
    const encrypted = this.crypto.encrypt(secret);

    await this.totpCredentials.save(
      this.totpCredentials.create({
        userId: user.id,
        secretCiphertext: encrypted.ciphertext,
        secretIv: encrypted.iv,
        secretAuthTag: encrypted.authTag,
        enabledAt: null,
        lastUsedStep: null,
      }),
    );

    const challengeToken = await this.createChallenge(
      user.id,
      AuthChallengePurpose.RegistrationTotp,
    );
    return {
      challengeToken,
      otpauthUri: generateURI({ issuer: this.issuer, label: normalizedEmail, secret }),
    };
  }

  async completeTotpSetup(challengeToken: string, code: string): Promise<TotpConfirmationResult> {
    const challenge = await this.getChallenge(
      challengeToken,
      AuthChallengePurpose.RegistrationTotp,
    );
    const credential = await this.totpCredentials.findOne({ where: { userId: challenge.userId } });

    if (!credential || credential.enabledAt) {
      throwAuthError(AuthErrorCode.ChallengeInvalid);
    }

    const secret = this.crypto.decrypt({
      ciphertext: credential.secretCiphertext,
      iv: credential.secretIv,
      authTag: credential.secretAuthTag,
    });
    await this.assertValidTotp(secret, code);

    credential.enabledAt = new Date();
    credential.lastUsedStep = String(this.currentTotpStep());
    await this.totpCredentials.save(credential);
    await this.consumeChallenge(challenge);

    const recoveryCodes = await this.createRecoveryCodes(challenge.userId);
    return this.withSession(challenge.userId, recoveryCodes);
  }

  async login(email: string, password: string): Promise<{ challengeToken: string }> {
    const user = await this.users.findOne({ where: { email: this.normalizeEmail(email) } });
    const validPassword = user
      ? await this.crypto.verifyPassword(user.passwordHash, password)
      : false;

    if (!user || !validPassword) {
      throwAuthError(AuthErrorCode.InvalidCredentials);
    }

    const credential = await this.totpCredentials.findOne({ where: { userId: user.id } });
    if (!credential?.enabledAt) {
      throwAuthError(AuthErrorCode.TotpSetupRequired);
    }

    return {
      challengeToken: await this.createChallenge(user.id, AuthChallengePurpose.LoginTotp),
    };
  }

  async completeTotpLogin(challengeToken: string, code: string): Promise<AuthSessionResult> {
    const challenge = await this.getChallenge(challengeToken, AuthChallengePurpose.LoginTotp);
    const credential = await this.totpCredentials.findOne({ where: { userId: challenge.userId } });

    if (!credential?.enabledAt) {
      throwAuthError(AuthErrorCode.TotpSetupRequired);
    }

    const secret = this.crypto.decrypt({
      ciphertext: credential.secretCiphertext,
      iv: credential.secretIv,
      authTag: credential.secretAuthTag,
    });
    await this.assertValidTotp(secret, code);
    await this.assertFreshTotpStep(credential);
    await this.consumeChallenge(challenge);

    return this.withSession(challenge.userId);
  }

  async useRecoveryCode(challengeToken: string, code: string): Promise<AuthSessionResult> {
    const challenge = await this.getChallenge(challengeToken, AuthChallengePurpose.LoginTotp);
    const candidates = await this.recoveryCodes.find({
      where: { userId: challenge.userId, usedAt: IsNull() },
    });
    const normalizedCode = code.trim().toUpperCase();
    const matchingCode = await this.findRecoveryCode(candidates, normalizedCode);

    if (!matchingCode) {
      throwAuthError(AuthErrorCode.RecoveryInvalid);
    }

    const recoveryUpdate = await this.recoveryCodes.update(
      { id: matchingCode.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (recoveryUpdate.affected !== 1) {
      throwAuthError(AuthErrorCode.RecoveryUsed);
    }
    await this.consumeChallenge(challenge);
    return this.withSession(challenge.userId);
  }

  async getUser(userId: string): Promise<AuthUserView> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throwAuthError(AuthErrorCode.SessionInvalid);
    return this.toUserView(user);
  }

  async completeOnboarding(
    userId: string,
    displayName: string,
    goals: string[],
  ): Promise<AuthUserView> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throwAuthError(AuthErrorCode.SessionInvalid);
    user.displayName = displayName.trim();
    user.goals = [...new Set(goals)];
    user.onboardingCompletedAt = new Date();
    await this.users.save(user);
    return this.toUserView(user);
  }

  private async withSession(
    userId: string,
    recoveryCodes?: string[],
  ): Promise<TotpConfirmationResult> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throwAuthError(AuthErrorCode.SessionInvalid);
    const { token } = await this.sessions.createSession(userId);

    return {
      user: this.toUserView(user),
      sessionToken: token,
      recoveryCodes: recoveryCodes ?? [],
    };
  }

  private async createRecoveryCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () => this.generateRecoveryCode());
    await this.recoveryCodes.save(
      await Promise.all(
        codes.map(async (code) =>
          this.recoveryCodes.create({
            userId,
            codeHash: await this.crypto.hashRecoveryCode(code),
            usedAt: null,
          }),
        ),
      ),
    );
    return codes;
  }

  private async findRecoveryCode(
    candidates: RecoveryCodeEntity[],
    code: string,
  ): Promise<RecoveryCodeEntity | undefined> {
    for (const candidate of candidates) {
      if (await this.crypto.verifyRecoveryCode(candidate.codeHash, code)) return candidate;
    }
    return undefined;
  }

  private async createChallenge(userId: string, purpose: AuthChallengePurpose): Promise<string> {
    const token = this.crypto.randomToken();
    await this.challenges.save(
      this.challenges.create({
        userId,
        tokenHash: this.crypto.hashToken(token),
        purpose,
        expiresAt: new Date(Date.now() + challengeTtlMs),
        consumedAt: null,
      }),
    );
    return token;
  }

  private async getChallenge(
    token: string,
    purpose: AuthChallengePurpose,
  ): Promise<AuthChallengeEntity> {
    const challenge = await this.challenges.findOne({
      where: { tokenHash: this.crypto.hashToken(token), purpose, consumedAt: IsNull() },
    });

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      throwAuthError(AuthErrorCode.ChallengeInvalid);
    }

    return challenge;
  }

  private async consumeChallenge(challenge: AuthChallengeEntity): Promise<void> {
    const challengeUpdate = await this.challenges.update(
      { id: challenge.id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
    if (challengeUpdate.affected !== 1) {
      throwAuthError(AuthErrorCode.ChallengeInvalid);
    }
  }

  private async assertValidTotp(secret: string, code: string): Promise<void> {
    const result = await verify({ secret, token: code });
    if (!result.valid) throwAuthError(AuthErrorCode.TotpInvalid);
  }

  private async assertFreshTotpStep(credential: TotpCredentialEntity): Promise<void> {
    const currentStep = this.currentTotpStep();
    if (credential.lastUsedStep && Number(credential.lastUsedStep) >= currentStep) {
      throwAuthError(AuthErrorCode.TotpAlreadyUsed);
    }
    const credentialUpdate = await this.totpCredentials
      .createQueryBuilder()
      .update(TotpCredentialEntity)
      .set({ lastUsedStep: String(currentStep) })
      .where('user_id = :userId', { userId: credential.userId })
      .andWhere('(last_used_step IS NULL OR last_used_step < :currentStep)', {
        currentStep,
      })
      .execute();

    if (credentialUpdate.affected !== 1) {
      throwAuthError(AuthErrorCode.TotpAlreadyUsed);
    }
  }

  private currentTotpStep(): number {
    return Math.floor(Date.now() / 30_000);
  }

  private generateRecoveryCode(): string {
    return `${this.crypto.randomRecoveryCode()}${randomInt(10, 100)}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toUserView(user: UserEntity): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      goals: user.goals ?? [],
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
    };
  }
}

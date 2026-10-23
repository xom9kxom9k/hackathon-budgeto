import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { SessionEntity } from './entities/session.entity';
import { TotpCredentialEntity } from './entities/totp-credential.entity';
import { UserEntity } from './entities/user.entity';

export class GetProfileQuery { constructor(public readonly userId: string) {} }
export class UpdateProfileCommand {
  constructor(public readonly userId: string, public readonly displayName: string, public readonly goals: string[]) {}
}
export class UpdateProfilePreferencesCommand {
  constructor(public readonly userId: string, public readonly locale?: string, public readonly timezone?: string) {}
}
export class ListSecuritySessionsQuery { constructor(public readonly userId: string) {} }
export class RevokeSecuritySessionCommand { constructor(public readonly userId: string, public readonly sessionId: string) {} }
export class RevokeAllSecuritySessionsCommand { constructor(public readonly userId: string, public readonly currentSessionId: string) {} }
export class GetSecurityStatusQuery { constructor(public readonly userId: string) {} }

function profileView(user: UserEntity) {
  return { id: user.id, email: user.email, displayName: user.displayName, goals: user.goals ?? [], locale: user.locale, timezone: user.timezone, createdAt: user.createdAt.toISOString() };
}

@QueryHandler(GetProfileQuery)
export class GetProfileHandler implements IQueryHandler<GetProfileQuery> {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}
  async execute(query: GetProfileQuery) {
    const user = await this.users.findOne({ where: { id: query.userId } });
    if (!user) throw new NotFoundException('PROFILE_NOT_FOUND');
    return profileView(user);
  }
}

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}
  async execute(command: UpdateProfileCommand) {
    const user = await this.users.findOne({ where: { id: command.userId } });
    if (!user) throw new NotFoundException('PROFILE_NOT_FOUND');
    const displayName = command.displayName.trim();
    if (!displayName || displayName.length > 80) throw new BadRequestException('PROFILE_INVALID_NAME');
    user.displayName = displayName;
    user.goals = [...new Set(command.goals.map((goal) => goal.trim()).filter(Boolean))];
    user.onboardingCompletedAt = user.onboardingCompletedAt ?? new Date();
    return profileView(await this.users.save(user));
  }
}

@CommandHandler(UpdateProfilePreferencesCommand)
export class UpdateProfilePreferencesHandler implements ICommandHandler<UpdateProfilePreferencesCommand> {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}
  async execute(command: UpdateProfilePreferencesCommand) {
    const user = await this.users.findOne({ where: { id: command.userId } });
    if (!user) throw new NotFoundException('PROFILE_NOT_FOUND');
    if (command.locale !== undefined && !['ru', 'en'].includes(command.locale)) throw new BadRequestException('PROFILE_INVALID_LOCALE');
    if (command.locale !== undefined) user.locale = command.locale;
    if (command.timezone !== undefined) user.timezone = command.timezone.trim() || 'UTC';
    return profileView(await this.users.save(user));
  }
}

@QueryHandler(ListSecuritySessionsQuery)
export class ListSecuritySessionsHandler implements IQueryHandler<ListSecuritySessionsQuery> {
  constructor(@InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>) {}
  async execute(query: ListSecuritySessionsQuery) {
    const sessions = await this.sessions.find({ where: { userId: query.userId }, order: { lastSeenAt: 'DESC' } });
    return sessions.map((session) => ({ id: session.id, createdAt: session.createdAt.toISOString(), lastSeenAt: session.lastSeenAt.toISOString(), expiresAt: session.expiresAt.toISOString(), revokedAt: session.revokedAt?.toISOString() ?? null }));
  }
}

@CommandHandler(RevokeSecuritySessionCommand)
export class RevokeSecuritySessionHandler implements ICommandHandler<RevokeSecuritySessionCommand> {
  constructor(@InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>) {}
  async execute(command: RevokeSecuritySessionCommand) {
    const result = await this.sessions.update({ id: command.sessionId, userId: command.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    if (result.affected !== 1) throw new NotFoundException('SESSION_NOT_FOUND');
    return { revoked: true };
  }
}

@CommandHandler(RevokeAllSecuritySessionsCommand)
export class RevokeAllSecuritySessionsHandler implements ICommandHandler<RevokeAllSecuritySessionsCommand> {
  constructor(@InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>) {}
  async execute(command: RevokeAllSecuritySessionsCommand) {
    const result = await this.sessions.createQueryBuilder().update(SessionEntity).set({ revokedAt: new Date() }).where('user_id = :userId', { userId: command.userId }).andWhere('revoked_at IS NULL').andWhere('id != :currentSessionId', { currentSessionId: command.currentSessionId }).execute();
    return { revoked: result.affected ?? 0 };
  }
}

@QueryHandler(GetSecurityStatusQuery)
export class GetSecurityStatusHandler implements IQueryHandler<GetSecurityStatusQuery> {
  constructor(@InjectRepository(TotpCredentialEntity) private readonly totp: Repository<TotpCredentialEntity>) {}
  async execute(query: GetSecurityStatusQuery) {
    const credential = await this.totp.findOne({ where: { userId: query.userId } });
    return { totpEnabled: Boolean(credential?.enabledAt), recoveryAvailable: true, vaultKeyConfigured: false };
  }
}

export const profileQueryHandlers = [GetProfileHandler, ListSecuritySessionsHandler, GetSecurityStatusHandler];
export const profileCommandHandlers = [UpdateProfileHandler, UpdateProfilePreferencesHandler, RevokeSecuritySessionHandler, RevokeAllSecuritySessionsHandler];

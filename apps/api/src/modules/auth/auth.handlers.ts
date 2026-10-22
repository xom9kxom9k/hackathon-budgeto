import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';

import {
  CompleteTotpLoginCommand,
  CompleteOnboardingCommand,
  CompleteTotpSetupCommand,
  LoginWithPasswordCommand,
  LogoutCommand,
  RegisterUserCommand,
  UseRecoveryCodeCommand,
} from './auth.commands';
import { AuthDomainService } from './auth.domain';
import { AuthCryptoService } from './auth.crypto';
import { AuthSessionService } from './auth.session';
import { GetCurrentUserQuery, GetSessionUserQuery } from './auth.queries';
import type { AuthPrincipal } from './auth.types';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: RegisterUserCommand) {
    return this.auth.register(command.email, command.password);
  }
}

@CommandHandler(CompleteOnboardingCommand)
export class CompleteOnboardingHandler implements ICommandHandler<CompleteOnboardingCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: CompleteOnboardingCommand) {
    return this.auth.completeOnboarding(command.userId, command.displayName, command.goals);
  }
}

@CommandHandler(CompleteTotpSetupCommand)
export class CompleteTotpSetupHandler implements ICommandHandler<CompleteTotpSetupCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: CompleteTotpSetupCommand) {
    return this.auth.completeTotpSetup(command.challengeToken, command.code);
  }
}

@CommandHandler(LoginWithPasswordCommand)
export class LoginWithPasswordHandler implements ICommandHandler<LoginWithPasswordCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: LoginWithPasswordCommand) {
    return this.auth.login(command.email, command.password);
  }
}

@CommandHandler(CompleteTotpLoginCommand)
export class CompleteTotpLoginHandler implements ICommandHandler<CompleteTotpLoginCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: CompleteTotpLoginCommand) {
    return this.auth.completeTotpLogin(command.challengeToken, command.code);
  }
}

@CommandHandler(UseRecoveryCodeCommand)
export class UseRecoveryCodeHandler implements ICommandHandler<UseRecoveryCodeCommand> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(command: UseRecoveryCodeCommand) {
    return this.auth.useRecoveryCode(command.challengeToken, command.code);
  }
}

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly sessions: AuthSessionService) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.sessions.revoke(command.sessionToken);
  }
}

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(private readonly auth: AuthDomainService) {}

  execute(query: GetCurrentUserQuery) {
    return this.auth.getUser(query.userId);
  }
}

@QueryHandler(GetSessionUserQuery)
export class GetSessionUserHandler implements IQueryHandler<GetSessionUserQuery> {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly crypto: AuthCryptoService,
  ) {}

  async execute(query: GetSessionUserQuery): Promise<AuthPrincipal | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.crypto.hashToken(query.sessionToken), revokedAt: IsNull() },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) return null;

    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user) return null;

    session.lastSeenAt = new Date();
    await this.sessions.save(session);
    return { userId: user.id, sessionId: session.id, email: user.email };
  }
}

export const authCommandHandlers = [
  CompleteOnboardingHandler,
  RegisterUserHandler,
  CompleteTotpSetupHandler,
  LoginWithPasswordHandler,
  CompleteTotpLoginHandler,
  UseRecoveryCodeHandler,
  LogoutHandler,
];

export const authQueryHandlers = [GetCurrentUserHandler, GetSessionUserHandler];

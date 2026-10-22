import { AuthChallengePurpose } from './entities/auth-challenge.entity';

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export class CompleteTotpSetupCommand {
  constructor(
    public readonly challengeToken: string,
    public readonly code: string,
  ) {}
}

export class LoginWithPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

export class CompleteTotpLoginCommand {
  constructor(
    public readonly challengeToken: string,
    public readonly code: string,
  ) {}
}

export class UseRecoveryCodeCommand {
  constructor(
    public readonly challengeToken: string,
    public readonly code: string,
  ) {}
}

export class LogoutCommand {
  constructor(public readonly sessionToken: string | undefined) {}
}

export class CompleteOnboardingCommand {
  constructor(
    public readonly userId: string,
    public readonly displayName: string,
    public readonly goals: string[],
  ) {}
}

export type AuthChallengeKind = AuthChallengePurpose;

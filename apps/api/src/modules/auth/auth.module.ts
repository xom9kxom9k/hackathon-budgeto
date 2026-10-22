import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthChallengeEntity } from './entities/auth-challenge.entity';
import { RecoveryCodeEntity } from './entities/recovery-code.entity';
import { SessionEntity } from './entities/session.entity';
import { TotpCredentialEntity } from './entities/totp-credential.entity';
import { UserEntity } from './entities/user.entity';

import { AuthController } from './auth.controller';
import { AuthCryptoService } from './auth.crypto';
import { AuthDomainService } from './auth.domain';
import { authCommandHandlers, authQueryHandlers } from './auth.handlers';
import { AuthGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';
import { AuthSessionService } from './auth.session';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      UserEntity,
      SessionEntity,
      TotpCredentialEntity,
      RecoveryCodeEntity,
      AuthChallengeEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthCryptoService,
    AuthDomainService,
    AuthSessionService,
    AuthGuard,
    CsrfGuard,
    ...authCommandHandlers,
    ...authQueryHandlers,
  ],
  exports: [AuthGuard],
})
export class AuthModule {}

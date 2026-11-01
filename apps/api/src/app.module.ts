import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ImportsModule } from './modules/imports/imports.module';
import { OverviewModule } from './modules/overview/overview.module';
import { VaultModule } from './modules/vault/vault.module';
import { CsrfGuard } from './modules/auth/csrf.guard';
import { SavingsModule } from './modules/savings/savings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url:
          config.get<string>('DATABASE_URL') ??
          'postgresql://budgeto:budgeto_dev@localhost:5432/budgeto',
        entities: [`${__dirname}/modules/**/entities/*.entity{.js,.ts}`],
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    CqrsModule.forRoot(),
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    ImportsModule,
    OverviewModule,
    VaultModule,
    SavingsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './health.controller';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({ imports: [CqrsModule.forRoot(), AccountsModule], controllers: [HealthController] })
export class AppModule {}

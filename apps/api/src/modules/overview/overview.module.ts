import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AuthModule } from '../auth/auth.module';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { OverviewController } from './overview.controller';
import { GetOverviewSummaryHandler } from './overview.handler';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    TypeOrmModule.forFeature([AccountEntity, CategoryEntity, TransactionEntity]),
  ],
  controllers: [OverviewController],
  providers: [GetOverviewSummaryHandler],
})
export class OverviewModule {}

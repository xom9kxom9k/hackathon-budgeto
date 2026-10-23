import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsController } from './transactions.controller';
import { ListTransactionsHandler } from './queries/list-transactions.handler';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    TypeOrmModule.forFeature([TransactionEntity, AccountEntity, CategoryEntity]),
  ],
  controllers: [TransactionsController],
  providers: [ListTransactionsHandler],
})
export class TransactionsModule {}

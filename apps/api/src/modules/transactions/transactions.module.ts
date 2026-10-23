import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './entities/transaction.entity';

@Module({ imports: [TypeOrmModule.forFeature([TransactionEntity])], exports: [TypeOrmModule] })
export class TransactionsModule {}

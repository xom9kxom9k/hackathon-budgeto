import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { ImportJobEntity } from './entities/import-job.entity';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { importCommandHandlers, importQueryHandlers } from './imports.handlers';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    VaultModule,
    TypeOrmModule.forFeature([ImportJobEntity, AccountEntity, CategoryEntity, TransactionEntity]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ...importCommandHandlers, ...importQueryHandlers],
})
export class ImportsModule {}

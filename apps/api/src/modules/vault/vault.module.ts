import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AuthModule } from '../auth/auth.module';
import { CategoryEntity } from '../categories/entities/category.entity';
import { ImportJobEntity } from '../imports/entities/import-job.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { VaultChainHeadEntity } from './entities/vault-chain-head.entity';
import { VaultEventEntity } from './entities/vault-event.entity';
import { VaultKeyEntity } from './entities/vault-key.entity';
import { VaultController } from './vault.controller';
import { vaultCommandHandlers, vaultQueryHandlers } from './vault.handlers';
import { VaultService } from './vault.service';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    TypeOrmModule.forFeature([
      VaultKeyEntity,
      VaultChainHeadEntity,
      VaultEventEntity,
      ImportJobEntity,
      AccountEntity,
      CategoryEntity,
      TransactionEntity,
    ]),
  ],
  controllers: [VaultController],
  providers: [VaultService, ...vaultCommandHandlers, ...vaultQueryHandlers],
  exports: [VaultService],
})
export class VaultModule {}

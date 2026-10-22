import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from './entities/account.entity';
import { AuthModule } from '../auth/auth.module';
import { AccountsController } from './accounts.controller';
import { ListAccountsHandler } from './queries/list-accounts.handler';
@Module({
  imports: [CqrsModule, AuthModule, TypeOrmModule.forFeature([AccountEntity])],
  controllers: [AccountsController],
  providers: [ListAccountsHandler],
})
export class AccountsModule {}

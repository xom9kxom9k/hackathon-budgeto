import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountsController } from './accounts.controller';
import { ListAccountsHandler } from './queries/list-accounts.handler';
@Module({
  imports: [CqrsModule],
  controllers: [AccountsController],
  providers: [ListAccountsHandler],
})
export class AccountsModule {}

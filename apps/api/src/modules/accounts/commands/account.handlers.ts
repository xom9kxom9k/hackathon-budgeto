import { ConflictException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from '../entities/account.entity';
import { AccountMutationResult, ArchiveAccountCommand, CreateAccountCommand, UpdateAccountCommand } from '../accounts.commands';

function view(account: AccountEntity): AccountMutationResult {
  return { id: account.id, name: account.name, currency: account.currency, archivedAt: account.archivedAt?.toISOString() ?? null };
}

function duplicate(): never {
  throw new ConflictException({ code: 'ACCOUNT_NAME_TAKEN' });
}

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
  constructor(@InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>) {}

  async execute(command: CreateAccountCommand): Promise<AccountMutationResult> {
    const name = command.name.trim();
    const currency = command.currency.trim().toUpperCase();
    const existing = await this.accounts.createQueryBuilder('account').where('account.user_id = :userId', { userId: command.userId }).andWhere('account.archived_at IS NULL').andWhere('LOWER(account.name) = LOWER(:name)', { name }).getOne();
    if (existing) duplicate();
    try {
      return view(await this.accounts.save(this.accounts.create({ userId: command.userId, name, currency, archivedAt: null })));
    } catch (error) {
      if (error instanceof Error && error.message.includes('UQ_accounts_active_user_name_ci')) duplicate();
      throw error;
    }
  }
}

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
  constructor(@InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>) {}

  async execute(command: UpdateAccountCommand): Promise<AccountMutationResult> {
    const account = await this.accounts.findOne({ where: { id: command.id, userId: command.userId } });
    if (!account || account.archivedAt) throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND' });
    const name = command.name.trim();
    const existing = await this.accounts.createQueryBuilder('account').where('account.user_id = :userId', { userId: command.userId }).andWhere('account.archived_at IS NULL').andWhere('account.id != :id', { id: command.id }).andWhere('LOWER(account.name) = LOWER(:name)', { name }).getOne();
    if (existing) duplicate();
    account.name = name;
    try {
      return view(await this.accounts.save(account));
    } catch (error) {
      if (error instanceof Error && error.message.includes('UQ_accounts_active_user_name_ci')) duplicate();
      throw error;
    }
  }
}

@CommandHandler(ArchiveAccountCommand)
export class ArchiveAccountHandler implements ICommandHandler<ArchiveAccountCommand> {
  constructor(@InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>) {}

  async execute(command: ArchiveAccountCommand): Promise<AccountMutationResult> {
    const account = await this.accounts.findOne({ where: { id: command.id, userId: command.userId } });
    if (!account) throw new NotFoundException({ code: 'ACCOUNT_NOT_FOUND' });
    if (account.archivedAt) throw new HttpException({ code: 'REFERENCE_ALREADY_ARCHIVED' }, HttpStatus.CONFLICT);
    account.archivedAt = new Date();
    return view(await this.accounts.save(account));
  }
}

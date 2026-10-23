import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { CategoryEntity, CategoryKind } from '../../categories/entities/category.entity';
import { VaultService } from '../../vault/vault.service';
import { VaultEventEntity, VaultEventType } from '../../vault/entities/vault-event.entity';
import {
  CreateTransactionCommand,
  ReverseTransactionCommand,
  TransactionMutationInput,
  UpdateTransactionCommand,
} from '../transactions.commands';
import { TransactionEntity, TransactionKind } from '../entities/transaction.entity';
import {
  GetTransactionQuery,
  PrepareTransactionClaimQuery,
  TransactionDetailView,
} from '../queries/get-transaction.query';
import { mapTransactionRow, TransactionRow } from '../queries/list-transactions.query';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<CreateTransactionCommand> {
  constructor(
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    private readonly dataSource: DataSource,
    private readonly vault: VaultService,
  ) {}

  execute(command: CreateTransactionCommand) {
    return this.mutate(command.userId, command.input);
  }

  private async mutate(userId: string, input: TransactionMutationInput) {
    const references = await validateReferences(this.accounts, this.categories, userId, input);
    const key = await this.vault.getKey(userId);
    if (!key) throw new BadRequestException('VAULT_KEY_REQUIRED');
    const claim = this.vault.createManualClaim(
      userId,
      input,
      references.account.id,
      references.destination?.id ?? null,
      references.category?.id ?? null,
    );
    const [proof] = this.vault.validateProofs(
      [claim],
      [input.proof],
      key.publicKey,
      key.keyVersion,
    );
    return this.dataSource.transaction(async (manager) => {
      const existingEvent = await manager.getRepository(VaultEventEntity).findOne({
        where: { userId, operationId: input.operationId },
      });
      if (existingEvent) {
        return manager.getRepository(TransactionEntity).findOneOrFail({
          where: { id: existingEvent.transactionId, userId },
        });
      }
      const transactions = manager.getRepository(TransactionEntity);
      const insertResult = await transactions
        .createQueryBuilder()
        .insert()
        .into(TransactionEntity)
        .values({
          userId,
          accountId: references.account.id,
          destinationAccountId: references.destination?.id ?? null,
          categoryId: references.category?.id ?? null,
          date: input.date,
          kind: input.kind,
          amount: input.amount.toFixed(2),
          note: input.note?.trim() || null,
          fingerprint: proof.fingerprint,
          importJobId: null,
          importRow: null,
        })
        .orIgnore()
        .execute();
      if (!insertResult.identifiers.length)
        throw new ConflictException('TRANSACTION_ALREADY_EXISTS');
      const transaction = await transactions.findOneOrFail({
        where: { userId, fingerprint: proof.fingerprint },
      });
      await this.vault.appendTransactionEvents(manager, userId, [
        {
          transaction,
          proof,
          eventType: VaultEventType.TransactionConfirmed,
          operationId: input.operationId,
        },
      ]);
      return transaction;
    });
  }
}

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler implements ICommandHandler<UpdateTransactionCommand> {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    private readonly dataSource: DataSource,
    private readonly vault: VaultService,
  ) {}

  async execute(command: UpdateTransactionCommand) {
    const current = await this.transactions.findOne({
      where: { id: command.transactionId, userId: command.userId },
    });
    if (!current) throw new NotFoundException('TRANSACTION_NOT_FOUND');
    if (current.importJobId)
      throw new BadRequestException('IMPORTED_TRANSACTION_EDIT_REQUIRES_REVISION');
    const references = await validateReferences(
      this.accounts,
      this.categories,
      command.userId,
      command.input,
    );
    const key = await this.vault.getKey(command.userId);
    if (!key) throw new BadRequestException('VAULT_KEY_REQUIRED');
    const claim = this.vault.createManualClaim(
      command.userId,
      command.input,
      references.account.id,
      references.destination?.id ?? null,
      references.category?.id ?? null,
      current.id,
    );
    const [proof] = this.vault.validateProofs(
      [claim],
      [command.input.proof],
      key.publicKey,
      key.keyVersion,
    );
    return this.dataSource.transaction(async (manager) => {
      const existingEvent = await manager.getRepository(VaultEventEntity).findOne({
        where: { userId: command.userId, operationId: command.input.operationId },
      });
      if (existingEvent) {
        return manager.getRepository(TransactionEntity).findOneOrFail({
          where: { id: existingEvent.transactionId, userId: command.userId },
        });
      }
      const transaction = await manager
        .getRepository(TransactionEntity)
        .createQueryBuilder('transaction')
        .setLock('pessimistic_write')
        .where('transaction.id = :id AND transaction.user_id = :userId', {
          id: current.id,
          userId: command.userId,
        })
        .getOne();
      if (!transaction) throw new NotFoundException('TRANSACTION_NOT_FOUND');
      if (transaction.importJobId)
        throw new BadRequestException('IMPORTED_TRANSACTION_EDIT_REQUIRES_REVISION');
      transaction.accountId = references.account.id;
      transaction.destinationAccountId = references.destination?.id ?? null;
      transaction.categoryId = references.category?.id ?? null;
      transaction.date = command.input.date;
      transaction.kind = command.input.kind;
      transaction.amount = command.input.amount.toFixed(2);
      transaction.note = command.input.note?.trim() || null;
      transaction.fingerprint = proof.fingerprint;
      const saved = await manager.getRepository(TransactionEntity).save(transaction);
      await this.vault.appendTransactionEvents(manager, command.userId, [
        {
          transaction: saved,
          proof,
          eventType: VaultEventType.TransactionUpdated,
          operationId: command.input.operationId,
        },
      ]);
      return saved;
    });
  }
}

@CommandHandler(ReverseTransactionCommand)
export class ReverseTransactionHandler implements ICommandHandler<ReverseTransactionCommand> {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly vault: VaultService,
  ) {}

  async execute(command: ReverseTransactionCommand) {
    const transaction = await this.transactions.findOne({
      where: { id: command.transactionId, userId: command.userId },
    });
    if (!transaction) throw new NotFoundException('TRANSACTION_NOT_FOUND');
    const key = await this.vault.getKey(command.userId);
    if (!key) throw new BadRequestException('VAULT_KEY_REQUIRED');
    const claim = this.vault.createReversalClaim(command.userId, transaction, command.operationId);
    const [proof] = this.vault.validateProofs(
      [claim],
      [command.proof],
      key.publicKey,
      key.keyVersion,
    );
    return this.dataSource.transaction(async (manager) => {
      const existingEvent = await manager.getRepository(VaultEventEntity).findOne({
        where: { userId: command.userId, operationId: command.operationId },
      });
      if (existingEvent) {
        return manager.getRepository(TransactionEntity).findOneOrFail({
          where: { id: existingEvent.transactionId, userId: command.userId },
        });
      }
      const locked = await manager
        .getRepository(TransactionEntity)
        .createQueryBuilder('transaction')
        .setLock('pessimistic_write')
        .where('transaction.id = :id AND transaction.user_id = :userId', {
          id: command.transactionId,
          userId: command.userId,
        })
        .getOne();
      if (!locked) throw new NotFoundException('TRANSACTION_NOT_FOUND');
      if (locked.reversedAt) throw new ConflictException('TRANSACTION_ALREADY_REVERSED');
      locked.reversedAt = new Date();
      const saved = await manager.getRepository(TransactionEntity).save(locked);
      await this.vault.appendTransactionEvents(manager, command.userId, [
        {
          transaction: saved,
          proof,
          eventType: VaultEventType.TransactionReversed,
          operationId: command.operationId,
        },
      ]);
      return saved;
    });
  }
}

@QueryHandler(GetTransactionQuery)
export class GetTransactionHandler implements IQueryHandler<GetTransactionQuery> {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}
  async execute(query: GetTransactionQuery): Promise<TransactionDetailView> {
    const row = await this.transactions
      .createQueryBuilder('transaction')
      .leftJoin(
        AccountEntity,
        'account',
        'account.id = transaction.account_id AND account.user_id = :userId',
      )
      .leftJoin(
        AccountEntity,
        'destinationAccount',
        'destinationAccount.id = transaction.destination_account_id AND destinationAccount.user_id = :userId',
      )
      .leftJoin(
        CategoryEntity,
        'category',
        'category.id = transaction.category_id AND category.user_id = :userId',
      )
      .where('transaction.id = :transactionId AND transaction.user_id = :userId', {
        transactionId: query.transactionId,
        userId: query.userId,
      })
      .select([
        'transaction.id AS id',
        'transaction.date AS date',
        'transaction.kind AS kind',
        'transaction.amount AS amount',
        'transaction.note AS note',
        'transaction.reversed_at AS "reversedAt"',
        'account.id AS "accountId"',
        'account.name AS "accountName"',
        'account.currency AS "accountCurrency"',
        'destinationAccount.id AS "destinationAccountId"',
        'destinationAccount.name AS "destinationAccountName"',
        'destinationAccount.currency AS "destinationAccountCurrency"',
        'category.id AS "categoryId"',
        'category.name AS "categoryName"',
        'category.kind AS "categoryKind"',
      ])
      .getRawOne<TransactionRow & { reversedAt: Date | null }>();
    if (!row) throw new NotFoundException('TRANSACTION_NOT_FOUND');
    return { ...mapTransactionRow(row), reversedAt: row.reversedAt?.toISOString() ?? null };
  }
}

@QueryHandler(PrepareTransactionClaimQuery)
export class PrepareTransactionClaimHandler implements IQueryHandler<PrepareTransactionClaimQuery> {
  constructor(
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    private readonly vault: VaultService,
  ) {}
  async execute(query: PrepareTransactionClaimQuery) {
    const references = await validateReferences(
      this.accounts,
      this.categories,
      query.userId,
      query.input,
    );
    return this.vault.createManualClaim(
      query.userId,
      query.input,
      references.account.id,
      references.destination?.id ?? null,
      references.category?.id ?? null,
    );
  }
}

async function validateReferences(
  accounts: Repository<AccountEntity>,
  categories: Repository<CategoryEntity>,
  userId: string,
  input: Omit<TransactionMutationInput, 'proof'>,
) {
  const account = await accounts.findOne({
    where: { id: input.accountId, userId, archivedAt: IsNull() },
  });
  if (!account) throw new BadRequestException('ACCOUNT_NOT_FOUND');
  if (input.kind === TransactionKind.Transfer && !input.destinationAccountId)
    throw new BadRequestException('DESTINATION_REQUIRED');
  if (input.destinationAccountId === input.accountId)
    throw new BadRequestException('TRANSFER_SAME_ACCOUNT');
  const destination = input.destinationAccountId
    ? await accounts.findOne({
        where: { id: input.destinationAccountId, userId, archivedAt: IsNull() },
      })
    : null;
  if (input.kind === TransactionKind.Transfer && !destination)
    throw new BadRequestException('DESTINATION_NOT_FOUND');
  if (destination && destination.currency !== account.currency)
    throw new BadRequestException('CROSS_CURRENCY_TRANSFER');
  if (input.kind !== TransactionKind.Transfer && !input.categoryId)
    throw new BadRequestException('CATEGORY_REQUIRED');
  const category = input.categoryId
    ? await categories.findOne({ where: { id: input.categoryId, userId, archivedAt: IsNull() } })
    : null;
  if (
    input.categoryId &&
    (!category ||
      category.kind !==
        (input.kind === TransactionKind.Income ? CategoryKind.Income : CategoryKind.Expense))
  )
    throw new BadRequestException('CATEGORY_INVALID');
  return { account, destination, category };
}

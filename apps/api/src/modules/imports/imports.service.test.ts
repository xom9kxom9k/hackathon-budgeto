import { ImportJobEntity, ImportJobStatus } from './entities/import-job.entity';
import { ImportsService } from './imports.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { CategoryEntity } from '../categories/entities/category.entity';

vi.mock('./imports.queue', () => ({
  createImportQueue: () => ({ add: vi.fn() }),
}));

function createService() {
  const job: Partial<ImportJobEntity> = {
    id: 'job-1',
    userId: 'user-1',
    fileName: 'statement.xlsx',
    filePath: '',
    status: ImportJobStatus.Preview,
    preview: {
      format: 'budgeto-xlsx',
      total: 1,
      valid: 1,
      invalid: 0,
      rows: [
        {
          sourceRow: 2,
          date: '2026-01-01',
          type: 'expense',
          amount: 10,
          accountName: 'Card',
          destinationAccountName: null,
          categoryName: 'Food',
          note: null,
          valid: true,
          errors: [],
          warnings: [],
        },
      ],
    },
    createdCount: 0,
    skippedCount: 0,
  };
  const accounts = [{ id: 'account-1', name: 'Card', currency: 'RUB' }];
  const categories = [{ id: 'category-1', name: 'Food', kind: 'expense' }];
  const fingerprints = new Set<string>();
  let transactionNumber = 0;
  let appendCalls = 0;
  let lock = Promise.resolve();

  const jobs = {
    findOne: vi.fn(async () => job),
    update: vi.fn(async (_id: string, values: Partial<ImportJobEntity>) => {
      Object.assign(job, values);
      return undefined;
    }),
  };
  const transactionRepository = {
    exists: vi.fn(async () => false),
    createQueryBuilder: vi.fn(() => {
      const builder = {
        insert: () => builder,
        into: () => builder,
        values: () => builder,
        orIgnore: () => builder,
        execute: async () => {
          const fingerprint = 'fingerprint-1';
          if (fingerprints.has(fingerprint)) return { identifiers: [] };
          fingerprints.add(fingerprint);
          transactionNumber += 1;
          return { identifiers: [{ id: `transaction-${transactionNumber}` }] };
        },
      };
      return builder;
    }),
    findOneOrFail: vi.fn(async () => ({
      id: 'transaction-1',
      userId: 'user-1',
      importJobId: 'job-1',
      importRow: 2,
    })),
  };
  const accountRepository = { find: vi.fn(async () => accounts) };
  const categoryRepository = { find: vi.fn(async () => categories) };
  const importJobRepository = {
    createQueryBuilder: vi.fn(() => ({
      setLock: () => ({
        where: () => ({ getOne: async () => job }),
      }),
    })),
    update: vi.fn(async (_id: string, values: Partial<ImportJobEntity>) => {
      Object.assign(job, values);
      return undefined;
    }),
  };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === ImportJobEntity) return importJobRepository;
      if (entity === AccountEntity) return accountRepository;
      if (entity === CategoryEntity) return categoryRepository;
      return transactionRepository;
    },
  };
  const dataSource = {
    transaction: async <T>(callback: (value: typeof manager) => Promise<T>) => {
      const previous = lock;
      let release!: () => void;
      lock = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(manager);
      } finally {
        release();
      }
    },
  };
  const vault = {
    getKey: vi.fn(async () => ({ publicKey: 'public-key', keyVersion: 1 })),
    prepareImportConfirmation: vi.fn(async () => ({
      claims: [
        {
          sourceRow: 2,
          operationId: 'import:job-1:2',
          fingerprint: 'fingerprint-1',
          payloadHash: 'payload-hash',
          canonicalPayload: '{}',
          claimDigest: 'claim-digest',
        },
      ],
    })),
    validateProofs: vi.fn((_claims: unknown[], proofs: unknown[]) => [
      {
        ...(proofs[0] as Record<string, unknown>),
        sourceRow: 2,
        fingerprint: 'fingerprint-1',
        claim: {
          operationId: 'import:job-1:2',
          claimDigest: 'claim-digest',
        },
      },
    ]),
    appendTransactionEvents: vi.fn(async () => {
      appendCalls += 1;
    }),
  };
  const service = new ImportsService(
    jobs as never,
    accountRepository as never,
    categoryRepository as never,
    transactionRepository as never,
    dataSource as never,
    vault as never,
  );

  return { service, job, appendCalls: () => appendCalls, vault };
}

describe('ImportsService confirmation', () => {
  it('serializes concurrent confirms and returns stored counters on retry', async () => {
    const { service, job, appendCalls, vault } = createService();
    const proof = { sourceRow: 2 };

    const results = await Promise.all([
      service.confirm('user-1', 'job-1', [proof] as never),
      service.confirm('user-1', 'job-1', [proof] as never),
    ]);

    expect(results).toEqual([
      { created: 1, skipped: 0 },
      { created: 1, skipped: 0 },
    ]);
    expect(job.status).toBe(ImportJobStatus.Confirmed);
    expect(job.createdCount).toBe(1);
    expect(job.skippedCount).toBe(0);
    expect(appendCalls()).toBe(1);
    expect(vault.appendTransactionEvents).toHaveBeenCalledOnce();
  });

  it('does not confirm a profile that still requires manual review', async () => {
    const { service, job } = createService();
    job.preview = {
      ...(job.preview as Record<string, unknown>),
      reviewRequired: true,
      reviewReasons: ['PROFILE_REVIEW_REQUIRED'],
    };
    await expect(service.confirm('user-1', 'job-1', [{ sourceRow: 2 }] as never)).rejects.toThrow(
      'IMPORT_REVIEW_REQUIRED',
    );
  });

  it('does not clear manual review on a no-op rows update', async () => {
    const { service, job } = createService();
    job.preview = {
      ...(job.preview as Record<string, unknown>),
      reviewRequired: true,
      reviewReasons: ['PROFILE_REVIEW_REQUIRED'],
    };
    const row = (job.preview as { rows: unknown[] }).rows[0];
    await service.updateRows('user-1', 'job-1', [row] as never);
    expect((job.preview as { reviewRequired: boolean }).reviewRequired).toBe(true);
  });

  it('keeps the parsed row and a hashed diff when a row is corrected', async () => {
    const { service, job } = createService();
    const row = (job.preview as { rows: Array<Record<string, unknown>> }).rows[0];

    await service.updateRows('user-1', 'job-1', [{ ...row, note: 'Corrected note' }] as never);

    const preview = job.preview as {
      originalRows: Array<Record<string, unknown>>;
      editLog: Array<Record<string, unknown>>;
    };
    expect(preview.originalRows[0].note).toBeNull();
    expect(preview.editLog[0]).toMatchObject({
      sourceRow: 2,
      fields: ['note'],
      before: { note: null },
      after: { note: 'Corrected note' },
    });
    expect(preview.editLog[0].editHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not clear manual review when only one row was reviewed', async () => {
    const { service, job } = createService();
    const firstRow = (job.preview as { rows: Array<Record<string, unknown>> }).rows[0];
    const secondRow = {
      ...firstRow,
      sourceRow: 3,
      sourceRef: { kind: 'xlsx', record: 3 },
      note: 'Вторая строка',
    };
    job.preview = {
      ...(job.preview as Record<string, unknown>),
      reviewRequired: true,
      reviewReasons: ['PROFILE_REVIEW_REQUIRED'],
      rows: [firstRow, secondRow],
      total: 2,
      valid: 2,
      invalid: 0,
    };
    await service.updateRows('user-1', 'job-1', [
      { ...firstRow, note: 'Исправлено' },
      secondRow,
    ] as never);
    expect((job.preview as { reviewRequired: boolean }).reviewRequired).toBe(true);
  });
});

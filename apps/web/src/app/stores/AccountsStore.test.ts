import type { Account } from '@/entities/account/model/types';
import type { AccountsService } from '@/shared/services/AccountsService';
import { AccountsStore } from './AccountsStore';

const account: Account = { id: 'account-1', name: 'Основной счёт', currency: 'RUB' };

describe('AccountsStore', () => {
  it('loads real accounts once and protects concurrent calls', async () => {
    let resolve!: (accounts: Account[]) => void;
    const list = vi.fn(
      () =>
        new Promise<Account[]>((done) => {
          resolve = done;
        }),
    );
    const store = new AccountsStore({ list } as unknown as AccountsService);

    const first = store.load();
    const second = store.load();
    resolve([account]);
    await Promise.all([first, second]);

    expect(list).toHaveBeenCalledOnce();
    expect(store.accounts).toEqual([account]);
    expect(store.status).toBe('success');
  });

  it('keeps empty and error states explicit and retries on demand', async () => {
    const list = vi
      .fn<() => Promise<Account[]>>()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([account]);
    const store = new AccountsStore({ list } as unknown as AccountsService);

    await store.load();
    expect(store.status).toBe('empty');
    await store.retry();
    expect(store.status).toBe('error');
    await store.retry();
    expect(store.status).toBe('success');
    expect(store.accounts).toEqual([account]);
  });
});

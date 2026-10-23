import { AccountsController } from './accounts.controller';

describe('AccountsController', () => {
  it('dispatches reads and mutations through the buses', async () => {
    const queries = { execute: vi.fn().mockResolvedValue([]) };
    const commands = { execute: vi.fn().mockResolvedValue({}) };
    const controller = new AccountsController(queries as never, commands as never);

    await controller.list({ userId: 'user-1' } as never);
    await controller.create({ userId: 'user-1' } as never, { name: ' Card ', currency: 'rub' });
    await controller.update({ userId: 'user-1' } as never, 'account-1', { name: 'Main card' });
    await controller.archive({ userId: 'user-1' } as never, 'account-1');

    expect(queries.execute).toHaveBeenCalledOnce();
    expect(commands.execute).toHaveBeenCalledTimes(3);
    expect(commands.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});

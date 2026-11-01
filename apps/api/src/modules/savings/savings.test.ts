import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Repository } from 'typeorm';
import {
  GetSavingsGoalHandler,
  GetSavingsGoalQuery,
  SaveSavingsGoalCommand,
  SaveSavingsGoalDto,
  SaveSavingsGoalHandler,
} from './savings.module';
import { SavingsGoalEntity } from './entities/savings-goal.entity';

describe('savings goals', () => {
  it('scopes reads and updates to the authenticated owner and currency', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValue({ name: 'Goal', target: '100.25', saved: '10.00', currency: 'USD' });
    const upsert = vi.fn().mockResolvedValue({});
    const repository = { findOne, upsert } as unknown as Repository<SavingsGoalEntity>;
    const where = { userId: 'owner', currency: 'USD' };
    expect(
      await new GetSavingsGoalHandler(repository).execute(new GetSavingsGoalQuery('owner', 'USD')),
    ).toMatchObject({ target: 100.25, saved: 10 });
    expect(findOne).toHaveBeenCalledWith({ where });
    await new SaveSavingsGoalHandler(repository).execute(
      new SaveSavingsGoalCommand('owner', 'USD', { name: ' Goal ', target: 100.25, saved: 10 }),
    );
    expect(upsert).toHaveBeenCalledWith(
      { ...where, name: 'Goal', target: '100.25', saved: '10.00' },
      ['userId', 'currency'],
    );
    expect(findOne).toHaveBeenLastCalledWith({ where });
  });
  it('returns no goal when this owner has none', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(null),
    } as unknown as Repository<SavingsGoalEntity>;
    expect(
      await new GetSavingsGoalHandler(repository).execute(new GetSavingsGoalQuery('owner', 'RUB')),
    ).toBeNull();
  });
  it.each([
    { name: ' ', target: 1, saved: 0 },
    { name: 'Goal', target: 0, saved: 0 },
    { name: 'Goal', target: 1, saved: -1 },
    { name: 'Goal', target: 1.001, saved: 0 },
    { name: 'Goal', target: Infinity, saved: 0 },
  ])('rejects invalid goal values: %j', async (input) => {
    expect((await validate(plainToInstance(SaveSavingsGoalDto, input))).length).toBeGreaterThan(0);
  });
});

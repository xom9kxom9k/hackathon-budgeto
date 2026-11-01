import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { TransactionClaimDto, TransactionMutationDto } from './transactions.dto';

const input = {
  date: '2026-11-01',
  kind: 'expense',
  amount: 180,
  accountId: 'fe432fd3-7fe6-4490-8908-f59ccdb13359',
  operationId: '6c550a76-d272-416e-ad35-3f4f518135c1',
};
describe('transaction request validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  it('accepts a claim request before its proof has been created', async () => {
    const result = await pipe.transform(input, { type: 'body', metatype: TransactionClaimDto });
    expect(result).toMatchObject(input);
  });
  it('still requires a proof when saving the transaction', async () => {
    await expect(
      pipe.transform(input, { type: 'body', metatype: TransactionMutationDto }),
    ).rejects.toThrow();
    await expect(
      pipe.transform({ ...input, proof: {} }, { type: 'body', metatype: TransactionMutationDto }),
    ).resolves.toBeDefined();
  });
  it.each([0, -1, 0.001])('rejects invalid amount %s on the claim endpoint', async (amount) => {
    await expect(
      pipe.transform({ ...input, amount }, { type: 'body', metatype: TransactionClaimDto }),
    ).rejects.toThrow();
  });
});

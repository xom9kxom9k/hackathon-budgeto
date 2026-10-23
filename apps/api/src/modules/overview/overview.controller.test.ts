import { BadRequestException } from '@nestjs/common';

import { GetOverviewSummaryQuery } from './overview.queries';
import { OverviewController, currentUtcMonth } from './overview.controller';

describe('OverviewController', () => {
  it('uses the current UTC month when no period is provided', async () => {
    const execute = vi.fn().mockResolvedValue({});
    const controller = new OverviewController({ execute } as never);

    await controller.summary({ userId: 'user-1' } as never, {});

    const [query] = execute.mock.calls[0] as [GetOverviewSummaryQuery];
    expect(query.userId).toBe('user-1');
    expect(query.filters).toEqual(currentUtcMonth());
  });

  it('rejects invalid and reversed periods', async () => {
    const controller = new OverviewController({ execute: vi.fn() } as never);

    await expect(
      controller.summary({ userId: 'user-1' } as never, {
        from: '2025-02-30',
        to: '2025-03-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.summary({ userId: 'user-1' } as never, {
        from: '2025-03-01',
        to: '2025-02-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

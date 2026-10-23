import { describe, expect, it, vi } from 'vitest';
import { ImportsController } from './imports.controller';
import {
  ConfirmImportJobHandler,
  CreateImportJobHandler,
  GetImportJobHandler,
  GetImportTemplateHandler,
  UpdateImportRowsHandler,
} from './imports.handlers';
import {
  ConfirmImportJobCommand,
  CreateImportJobCommand,
  UpdateImportRowsCommand,
} from './imports.commands';
import { GetImportJobQuery, GetImportTemplateQuery } from './imports.queries';
import type { ParsedImportRow } from '../../shared/import-parser/types';

describe('imports CQRS boundary', () => {
  it('dispatches controller endpoints through the appropriate bus', async () => {
    const commands = { execute: vi.fn().mockResolvedValue({ id: 'job-1' }) };
    const queries = { execute: vi.fn().mockResolvedValue({ id: 'job-1' }) };
    const controller = new ImportsController(commands as never, queries as never);
    const user = { userId: 'user-1' } as never;
    const file = { originalname: 'statement.xlsx', buffer: Buffer.from('xlsx') };

    await controller.create(user, file);
    await controller.get(user, 'job-1');
    await controller.rows(user, 'job-1', { rows: [] });
    await controller.confirm(user, 'job-1');
    await controller.template();

    expect(commands.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', fileName: 'statement.xlsx' }),
    );
    expect(commands.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', jobId: 'job-1' }),
    );
    expect(queries.execute).toHaveBeenCalledWith(expect.any(GetImportJobQuery));
    expect(queries.execute).toHaveBeenCalledWith(expect.any(GetImportTemplateQuery));
  });

  it('delegates commands and queries to ImportsService', async () => {
    const service = {
      create: vi.fn(),
      updateRows: vi.fn(),
      confirm: vi.fn(),
      getView: vi.fn(),
      template: vi.fn(),
    };
    const content = Buffer.from('xlsx');
    const rows: ParsedImportRow[] = [];

    await new CreateImportJobHandler(service as never).execute(
      new CreateImportJobCommand('user-1', 'statement.xlsx', content),
    );
    await new UpdateImportRowsHandler(service as never).execute(
      new UpdateImportRowsCommand('user-1', 'job-1', rows),
    );
    await new ConfirmImportJobHandler(service as never).execute(
      new ConfirmImportJobCommand('user-1', 'job-1'),
    );
    await new GetImportJobHandler(service as never).execute(
      new GetImportJobQuery('user-1', 'job-1'),
    );
    await new GetImportTemplateHandler(service as never).execute();

    expect(service.create).toHaveBeenCalledWith('user-1', 'statement.xlsx', content);
    expect(service.updateRows).toHaveBeenCalledWith('user-1', 'job-1', rows);
    expect(service.confirm).toHaveBeenCalledWith('user-1', 'job-1');
    expect(service.getView).toHaveBeenCalledWith('user-1', 'job-1');
    expect(service.template).toHaveBeenCalledOnce();
  });
});

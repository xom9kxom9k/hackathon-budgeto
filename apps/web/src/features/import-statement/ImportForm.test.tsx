import { importFileSchema } from './ImportForm';

describe('ImportForm', () => {
  it('rejects unsupported file extensions', async () => {
    const result = importFileSchema.safeParse({
      file: new File(['data'], 'statement.pdf', { type: 'application/pdf' }),
    });

    expect(result.success).toBe(false);
  });

  it('accepts an Excel statement in the upload schema', () => {
    const result = importFileSchema.safeParse({
      file: new File(['xlsx'], 'statement.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    });

    expect(result.success).toBe(true);
  });
});

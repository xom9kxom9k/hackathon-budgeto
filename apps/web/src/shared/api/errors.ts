export class ApiError extends Error {
  readonly code?: string;

  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = extractApiErrorCode(payload);
  }
}

function extractApiErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('code' in payload)) return undefined;

  const code = (payload as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

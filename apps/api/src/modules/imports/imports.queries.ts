export class GetImportJobQuery {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}

export class GetImportTemplateQuery {}

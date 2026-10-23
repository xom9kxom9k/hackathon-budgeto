export class GetImportJobQuery {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}

export class GetImportTemplateQuery {}

export class PrepareImportConfirmationQuery {
  constructor(
    public readonly userId: string,
    public readonly jobId: string,
  ) {}
}

export class ListImportJobsQuery {
  constructor(public readonly userId: string) {}
}

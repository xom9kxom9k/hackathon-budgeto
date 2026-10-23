export class ListVaultEventsQuery {
  constructor(public readonly userId: string) {}
}

export class GetVaultEventQuery {
  constructor(
    public readonly userId: string,
    public readonly eventId: string,
  ) {}
}

export class VerifyVaultIntegrityQuery {
  constructor(public readonly userId: string) {}
}

export class GetVaultKeyQuery {
  constructor(public readonly userId: string) {}
}

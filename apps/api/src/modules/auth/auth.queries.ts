export class GetCurrentUserQuery {
  constructor(public readonly userId: string) {}
}

export class GetSessionUserQuery {
  constructor(public readonly sessionToken: string) {}
}

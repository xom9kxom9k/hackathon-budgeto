export interface AccountView {
  id: string;
  name: string;
  currency: string;
}
export class ListAccountsQuery {
  constructor(public readonly userId: string) {}
}

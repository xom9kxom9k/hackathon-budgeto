import { makeAutoObservable } from 'mobx';

import type { RequestStatus } from '@/shared/types/request';
import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';

export class OverviewStore {
  status: RequestStatus = 'success';
  transactions: Transaction[] = [];
  cashflow: CashflowPoint[] = [];
  balance = 0;
  expenses = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
}

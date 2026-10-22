import { makeAutoObservable } from 'mobx';

import { demoCashflow, demoTransactions } from '@/shared/lib/demoData';
import type { RequestStatus } from '@/shared/types/request';
import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';

export class OverviewStore {
  status: RequestStatus = 'success';
  transactions: Transaction[] = demoTransactions;
  cashflow: CashflowPoint[] = demoCashflow;
  balance = 248550;
  expenses = 42480;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
}

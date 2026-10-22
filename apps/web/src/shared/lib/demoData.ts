import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';

export const demoTransactions: Transaction[] = [
  {
    id: 'demo-001',
    date: '22 окт',
    merchant: 'Кофейня на углу',
    category: 'Еда',
    amount: -420,
    currency: 'RUB',
  },
  {
    id: 'demo-002',
    date: '21 окт',
    merchant: 'Зарплата',
    category: 'Доход',
    amount: 185000,
    currency: 'RUB',
  },
  {
    id: 'demo-003',
    date: '20 окт',
    merchant: 'Городской транспорт',
    category: 'Транспорт',
    amount: -980,
    currency: 'RUB',
  },
  {
    id: 'demo-004',
    date: '19 окт',
    merchant: 'Онлайн-кинотеатр',
    category: 'Подписки',
    amount: -799,
    currency: 'RUB',
  },
];

export const demoCashflow: CashflowPoint[] = [
  { period: '1 нед.', income: 0, expenses: 12990 },
  { period: '2 нед.', income: 0, expenses: 8620 },
  { period: '3 нед.', income: 185000, expenses: 15140 },
  { period: '4 нед.', income: 0, expenses: 5730 },
];

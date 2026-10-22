import type { AccountSummary, Bank, FinancialProduct } from '@/entities/account/model/types';
import type { CashflowPoint, Transaction } from '@/entities/transaction/model/types';

export const demoBanks: Bank[] = [
  {
    id: 'demo-bank-a',
    name: 'Demo bank A',
    status: 'demo',
    lastSyncedAt: '22 окт 2026, 14:30',
    accountIds: ['demo-account-main', 'demo-account-savings'],
  },
  {
    id: 'demo-bank-b',
    name: 'Sandbox bank B',
    status: 'demo',
    lastSyncedAt: '20 окт 2026, 09:15',
    accountIds: ['demo-account-card'],
  },
];

export const demoAccounts: AccountSummary[] = [
  {
    id: 'demo-account-main',
    bankId: 'demo-bank-a',
    name: 'Основной счёт',
    type: 'Расчётный',
    currency: 'RUB',
    balance: 185420,
    status: 'demo',
    lastSyncedAt: '22 окт 2026, 14:30',
    productIds: ['demo-product-debit'],
  },
  {
    id: 'demo-account-savings',
    bankId: 'demo-bank-a',
    name: 'Накопительный счёт',
    type: 'Сбережения',
    currency: 'RUB',
    balance: 54000,
    status: 'demo',
    lastSyncedAt: '22 окт 2026, 14:30',
    productIds: ['demo-product-savings'],
  },
  {
    id: 'demo-account-card',
    bankId: 'demo-bank-b',
    name: 'Демо-карта',
    type: 'Карта',
    currency: 'RUB',
    balance: 9130,
    status: 'demo',
    lastSyncedAt: '20 окт 2026, 09:15',
    productIds: ['demo-product-card'],
  },
];

export const demoProducts: FinancialProduct[] = [
  {
    id: 'demo-product-debit',
    bankId: 'demo-bank-a',
    accountId: 'demo-account-main',
    name: 'Дебетовая карта',
    type: 'Карта',
    balance: 185420,
    currency: 'RUB',
    status: 'demo',
  },
  {
    id: 'demo-product-savings',
    bankId: 'demo-bank-a',
    accountId: 'demo-account-savings',
    name: 'Накопительный продукт',
    type: 'Сбережения',
    balance: 54000,
    currency: 'RUB',
    status: 'demo',
  },
  {
    id: 'demo-product-card',
    bankId: 'demo-bank-b',
    accountId: 'demo-account-card',
    name: 'Виртуальная карта',
    type: 'Карта',
    balance: 9130,
    currency: 'RUB',
    status: 'demo',
  },
];

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

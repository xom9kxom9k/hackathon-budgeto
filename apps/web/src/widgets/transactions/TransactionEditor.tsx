import { Button, Modal, ModalContent, ModalTitle } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { ApiError } from '@/shared/api/errors';
import { I18nKey } from '@/shared/i18n';
import type { TransactionInput } from '@/shared/services/TransactionsService';
import { VaultKeyPanel } from '@/shared/ui/VaultKeyPanel';

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const TransactionEditor = observer(function TransactionEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const accounts = useStore(StoreName.Accounts);
  const categories = useStore(StoreName.Categories);
  const transactions = useStore(StoreName.Transactions);
  const vault = useStore(StoreName.Vault);
  const [draft, setDraft] = useState<TransactionInput>(() => ({
    date: today(),
    kind: 'expense',
    amount: 0,
    accountId: accounts.accounts.length === 1 ? accounts.accounts[0].id : '',
    destinationAccountId: null,
    categoryId: null,
    note: null,
    operationId: crypto.randomUUID(),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  async function save() {
    if (saving) return;
    if (
      draft.kind === 'transfer' &&
      (!draft.destinationAccountId || draft.destinationAccountId === draft.accountId)
    ) {
      setError(t(I18nKey.TransactionInvalidTransfer));
      return;
    }
    if (vault.status !== 'unlocked') {
      setError(t(I18nKey.TransactionVaultRequired));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await transactions.create({
        ...draft,
        destinationAccountId: draft.kind === 'transfer' ? draft.destinationAccountId : null,
        categoryId: draft.kind === 'transfer' ? null : draft.categoryId,
      });
      onSaved();
    } catch (cause) {
      const payload = cause instanceof ApiError ? cause.payload : null;
      const message =
        payload && typeof payload === 'object' && 'message' in payload ? payload.message : null;
      const detail = Array.isArray(message)
        ? message.filter((value): value is string => typeof value === 'string').join('; ')
        : typeof message === 'string'
          ? message
          : '';
      setError(
        cause instanceof Error && cause.message === 'VAULT_KEY_REQUIRED'
          ? t(I18nKey.TransactionVaultRequired)
          : `${t(I18nKey.TransactionSaveError)}${detail ? ` (${detail})` : ''}`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      role="dialog"
      aria-modal="true"
      dimension="l"
      className="transaction-modal"
      aria-labelledby="transaction-editor-title"
      closeOnEscapeKeyDown={!saving}
      displayCloseIcon={!saving}
      onClose={saving ? undefined : onClose}
      locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
    >
      <ModalTitle id="transaction-editor-title">{t(I18nKey.TransactionsNew)}</ModalTitle>
      <ModalContent>
        <form
          className="transaction-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={saving} className="transaction-fields">
            <label className="form-field">
              <span>{t(I18nKey.Operation)}</span>
              <select
                autoFocus
                value={draft.kind}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    kind: event.target.value as TransactionInput['kind'],
                    categoryId: null,
                    destinationAccountId: null,
                  }));
                  setError('');
                }}
              >
                <option value="expense">{t(I18nKey.TransactionTypeExpense)}</option>
                <option value="income">{t(I18nKey.TransactionTypeIncome)}</option>
                <option value="transfer">{t(I18nKey.ActivityTransfer)}</option>
              </select>
            </label>
            <div className="form-two-columns">
              <label className="form-field">
                <span>{t(I18nKey.Amount)}</span>
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={draft.amount || ''}
                  onChange={(event) => set('amount', Number(event.target.value))}
                />
              </label>
              <label className="form-field">
                <span>{t(I18nKey.Date)}</span>
                <input
                  required
                  type="date"
                  value={draft.date}
                  onChange={(event) => set('date', event.target.value)}
                />
              </label>
            </div>
            <label className="form-field">
              <span>{t(I18nKey.Account)}</span>
              <select
                required
                value={draft.accountId}
                onChange={(event) => {
                  const accountId = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    accountId,
                    destinationAccountId:
                      current.destinationAccountId === accountId
                        ? null
                        : current.destinationAccountId,
                  }));
                  setError('');
                }}
              >
                <option value="" disabled>
                  {t(I18nKey.TransactionChooseAccount)}
                </option>
                {accounts.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </select>
            </label>
            {draft.kind === 'transfer' ? (
              <label className="form-field">
                <span>{t(I18nKey.ImportsDestinationAccount)}</span>
                <select
                  required
                  value={draft.destinationAccountId ?? ''}
                  onChange={(event) => set('destinationAccountId', event.target.value)}
                >
                  <option value="" disabled>
                    {t(I18nKey.TransactionChooseAccount)}
                  </option>
                  {accounts.accounts
                    .filter((account) => account.id !== draft.accountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currency}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <label className="form-field">
                <span>{t(I18nKey.Category)}</span>
                <select
                  value={draft.categoryId ?? ''}
                  onChange={(event) => set('categoryId', event.target.value || null)}
                >
                  <option value="">{t(I18nKey.TransactionNoCategory)}</option>
                  {categories.byKind(draft.kind).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="form-field">
              <span>{t(I18nKey.ImportsNote)}</span>
              <input
                maxLength={500}
                value={draft.note ?? ''}
                onChange={(event) => set('note', event.target.value || null)}
              />
            </label>
          </fieldset>
          {vault.status !== 'unlocked' && <VaultKeyPanel />}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              appearance="secondary"
              dimension="m"
              type="button"
              disabled={saving}
              onClick={onClose}
            >
              {t(I18nKey.TransactionCancel)}
            </Button>
            <Button appearance="primary" dimension="m" type="submit" disabled={saving}>
              {t(saving ? I18nKey.TransactionSaving : I18nKey.AccountsSave)}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
});

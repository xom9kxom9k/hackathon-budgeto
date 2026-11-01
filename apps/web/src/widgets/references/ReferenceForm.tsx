import { Button } from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';
import type { CategoryKind } from '@/shared/services/CategoriesService';

interface ReferenceFormProps {
  initial?: { name: string; currency?: string; kind?: CategoryKind };
  error?: string;
  mode: 'account' | 'category';
  onCancel: () => void;
  onSubmit: (value: { name: string; currency?: string; kind?: CategoryKind }) => void;
  saving: boolean;
}

export type ReferenceFormValue = {
  name: string;
  currency?: string;
  kind?: CategoryKind;
};

export function ReferenceForm({
  initial,
  error,
  mode,
  onCancel,
  onSubmit,
  saving,
}: ReferenceFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'RUB');
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? 'expense');
  const isAccount = mode === 'account';

  return (
    <form
      className="reference-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(isAccount ? { name: name.trim(), currency } : { name: name.trim(), kind });
      }}
    >
      <label className="form-field">
        <span>{t(isAccount ? I18nKey.AccountsName : I18nKey.CategoriesName)}</span>
        <input
          autoFocus
          required
          maxLength={160}
          pattern=".*[^ ].*"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={saving}
        />
      </label>
      {isAccount ? (
        <label className="form-field">
          <span>{t(I18nKey.AccountsCurrency)}</span>
          <input
            required
            minLength={3}
            maxLength={3}
            pattern="[A-Z]{3}"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            disabled={saving || Boolean(initial)}
          />
        </label>
      ) : (
        <label className="form-field">
          <span>{t(I18nKey.CategoriesKind)}</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as CategoryKind)}
            disabled={saving || Boolean(initial)}
          >
            <option value="income">{t(I18nKey.CategoriesIncome)}</option>
            <option value="expense">{t(I18nKey.CategoriesExpense)}</option>
          </select>
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button
          type="button"
          appearance="secondary"
          dimension="m"
          onClick={onCancel}
          disabled={saving}
        >
          {isAccount ? t(I18nKey.AccountsCancel) : t(I18nKey.CategoriesCancel)}
        </Button>
        <Button type="submit" appearance="primary" dimension="m" disabled={saving || !name.trim()}>
          {isAccount ? t(I18nKey.AccountsSave) : t(I18nKey.CategoriesSave)}
        </Button>
      </div>
    </form>
  );
}

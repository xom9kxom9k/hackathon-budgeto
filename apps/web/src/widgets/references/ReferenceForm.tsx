import { Button, InputField, Option, Select } from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';
import type { CategoryKind } from '@/shared/services/CategoriesService';

interface ReferenceFormProps {
  initial?: { name: string; currency?: string; kind?: CategoryKind };
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

export function ReferenceForm({ initial, mode, onCancel, onSubmit, saving }: ReferenceFormProps) {
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
        onSubmit(isAccount ? { name, currency } : { name, kind });
      }}
    >
      <InputField
        label={isAccount ? t(I18nKey.AccountsName) : t(I18nKey.CategoriesName)}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      {isAccount ? (
        <InputField
          label={t(I18nKey.AccountsCurrency)}
          value={currency}
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          required
          disabled={Boolean(initial)}
        />
      ) : (
        <label className="filter-select">
          <span>{t(I18nKey.CategoriesKind)}</span>
          <Select
            aria-label={t(I18nKey.CategoriesKind)}
            value={kind}
            onSelectedChange={(value) => setKind(value as CategoryKind)}
            mode="select"
            disabled={Boolean(initial)}
          >
            <Option value="income">{t(I18nKey.CategoriesIncome)}</Option>
            <Option value="expense">{t(I18nKey.CategoriesExpense)}</Option>
          </Select>
        </label>
      )}
      <div className="reference-form-actions">
        <Button type="submit" appearance="primary" dimension="m" disabled={saving || !name.trim()}>
          {isAccount ? t(I18nKey.AccountsSave) : t(I18nKey.CategoriesSave)}
        </Button>
        <Button
          type="button"
          appearance="secondary"
          dimension="m"
          onClick={onCancel}
          disabled={saving}
        >
          {isAccount ? t(I18nKey.AccountsCancel) : t(I18nKey.CategoriesCancel)}
        </Button>
      </div>
    </form>
  );
}

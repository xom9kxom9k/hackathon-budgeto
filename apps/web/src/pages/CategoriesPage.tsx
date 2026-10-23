import { Button, Select, Option, StatusIndicator } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { Category, CategoryKind } from '@/shared/services/CategoriesService';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { ReferenceTabs } from '@/shared/ui/ReferenceTabs';
import { ReferenceForm } from '@/widgets/references/ReferenceForm';

export const CategoriesPage = observer(function CategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categoriesStore = useStore(StoreName.Categories);
  const [filter, setFilter] = useState<'all' | CategoryKind>('all');
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void categoriesStore.load();
  }, [categoriesStore]);

  const categories = useMemo(
    () => filter === 'all' ? categoriesStore.categories : categoriesStore.byKind(filter),
    [categoriesStore.categories, categoriesStore, filter],
  );

  const submitForm = async (value: { name: string; kind?: CategoryKind }) => {
    if (editing) await categoriesStore.update(editing.id, { name: value.name });
    else await categoriesStore.create({ name: value.name, kind: value.kind ?? 'expense' });
    if (categoriesStore.mutationStatus === 'success') {
      setFormOpen(false);
      setEditing(null);
    }
  };

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs items={[{ text: t(I18nKey.BreadcrumbOverview), url: '/overview' }, { text: t(I18nKey.CategoriesTitle) }]} />
      <section className="page-intro page-intro--with-action">
        <div>
          <span className="section-kicker">{t(I18nKey.CategoriesKicker)}</span>
          <h2>{t(I18nKey.CategoriesTitle)}</h2>
          <p>{t(I18nKey.CategoriesDescription)}</p>
        </div>
        <Button appearance="primary" dimension="m" onClick={() => { setEditing(null); setFormOpen(true); }}>{t(I18nKey.CategoriesAdd)}</Button>
      </section>
      <ReferenceTabs />
      {formOpen ? (
        <section className="reference-editor" aria-label={t(editing ? I18nKey.CategoriesEdit : I18nKey.CategoriesAdd)}>
          <h3>{t(editing ? I18nKey.CategoriesEdit : I18nKey.CategoriesAdd)}</h3>
          <ReferenceForm initial={editing ?? undefined} mode="category" onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={(value) => { void submitForm(value); }} saving={categoriesStore.mutationStatus === 'saving'} />
        </section>
      ) : null}
      {categoriesStore.mutationStatus === 'error' ? <div className="state-callout state-callout--error">{t(I18nKey.ReferencesMutationError)}</div> : null}
      {categoriesStore.status === 'error' ? (
        <div className="state-callout state-callout--error">
          <span>{t(I18nKey.CategoriesLoadError)}</span>
          <Button appearance="secondary" dimension="s" onClick={() => categoriesStore.retry()}>{t(I18nKey.AccountsRetry)}</Button>
        </div>
      ) : null}
      <section className="accounts-explorer" aria-label={t(I18nKey.CategoriesTitle)}>
        <div className="section-heading accounts-explorer-heading">
          <span className="section-kicker">{t(I18nKey.CategoriesKind)}</span>
          <label className="filter-select">
            <span>{t(I18nKey.CategoriesKind)}</span>
            <Select value={filter} onSelectedChange={(value) => setFilter(value as 'all' | CategoryKind)} aria-label={t(I18nKey.CategoriesKind)} mode="select">
              <Option value="all">{t(I18nKey.CategoriesAll)}</Option>
              <Option value="income">{t(I18nKey.CategoriesIncome)}</Option>
              <Option value="expense">{t(I18nKey.CategoriesExpense)}</Option>
            </Select>
          </label>
        </div>
        {categories.length === 0 ? (
          <div className="state-callout"><span>{t(I18nKey.CategoriesEmpty)}</span><Button appearance="secondary" dimension="s" onClick={() => navigate('/imports')}>{t(I18nKey.NavigationImports)}</Button></div>
        ) : (
          <div className="real-account-list">
            {categories.map((category) => (
              <div className="real-account-row" key={category.id}>
                <div className="real-account-main"><strong>{category.name}</strong><span>{category.kind === 'income' ? t(I18nKey.CategoriesIncome) : t(I18nKey.CategoriesExpense)}</span></div>
                <div className="real-account-actions"><StatusIndicator dimension="s" text={category.kind === 'income' ? t(I18nKey.CategoriesIncome) : t(I18nKey.CategoriesExpense)} /><Button appearance="secondary" dimension="s" onClick={() => { setEditing(category); setFormOpen(true); }}>{t(I18nKey.CategoriesEdit)}</Button><Button appearance="secondary" dimension="s" onClick={() => { if (window.confirm(t(I18nKey.CategoriesArchiveConfirm))) void categoriesStore.archive(category.id); }}>{t(I18nKey.CategoriesArchive)}</Button></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

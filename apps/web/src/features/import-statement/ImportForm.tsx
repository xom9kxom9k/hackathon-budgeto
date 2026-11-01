import { Badge, Button, StatusIndicator } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { type DragEvent, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { ImportRow } from '@/shared/services/ImportService';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';
import type { CategoryKind } from '@/shared/services/CategoriesService';
import { VaultKeyPanel } from '@/shared/ui/VaultKeyPanel';
import { ReferenceEditorModal } from '@/widgets/references/ReferenceEditorModal';
import type { ReferenceFormValue } from '@/widgets/references/ReferenceForm';

const maxFileSize = 8 * 1024 * 1024;
const issueTranslations: Record<string, I18nKey> = {
  INVALID_DATE: I18nKey.ImportsIssueInvalidDate,
  UNKNOWN_TYPE: I18nKey.ImportsIssueUnknownType,
  INVALID_AMOUNT: I18nKey.ImportsIssueInvalidAmount,
  ACCOUNT_REQUIRED: I18nKey.ImportsIssueAccountRequired,
  ACCOUNT_NOT_FOUND: I18nKey.ImportsIssueAccountNotFound,
  DESTINATION_REQUIRED: I18nKey.ImportsIssueDestinationRequired,
  DESTINATION_NOT_FOUND: I18nKey.ImportsIssueDestinationNotFound,
  TRANSFER_SAME_ACCOUNT: I18nKey.ImportsIssueSameAccount,
  CATEGORY_NOT_FOUND: I18nKey.ImportsIssueCategoryNotFound,
  CATEGORY_TYPE_MISMATCH: I18nKey.ImportsIssueCategoryTypeMismatch,
  TRANSFER_CATEGORY_IGNORED: I18nKey.ImportsIssueTransferCategoryIgnored,
  DESTINATION_ONLY_FOR_TRANSFER: I18nKey.ImportsIssueDestinationOnlyTransfer,
  PDF_AMOUNT_AMBIGUOUS: I18nKey.ImportsIssuePdfAmountAmbiguous,
  EDIT_REQUIRES_RECHECK: I18nKey.ImportsIssueRequiresRecheck,
};
const typeOptions = [
  ['income', I18nKey.ImportsTypeIncome],
  ['expense', I18nKey.ImportsTypeExpense],
  ['transfer', I18nKey.ImportsTypeTransfer],
] as const;

export const importFileSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      I18nKey.ImportsValidationRequired,
    )
    .refine((file) => /\.(xlsx|xlsm|csv|pdf)$/i.test(file.name), I18nKey.ImportsValidationType)
    .refine((file) => file.size <= maxFileSize, I18nKey.ImportsValidationSize),
});
type ImportFormValues = z.infer<typeof importFileSchema>;
type RowFilter = 'all' | 'invalid' | 'valid';
type SortField = 'date' | 'amount' | 'sourceRow';
type SortDirection = 'asc' | 'desc';
type BulkField = 'accountName' | 'destinationAccountName' | 'categoryName';
type ImportFormProps = {
  onJobCreated: (jobId: string) => void;
  onNewImport: () => void;
};

function issueText(code: string, t: (key: I18nKey) => string): string {
  return t(issueTranslations[code] ?? I18nKey.ImportsRowInvalid);
}

function rowHasIssues(row: ImportRow): boolean {
  return !row.valid || row.errors.length > 0;
}

function isPdfFile(file: File | null): boolean {
  return Boolean(file && /\.pdf$/i.test(file.name));
}

export const ImportForm = observer(function ImportForm({
  onJobCreated,
  onNewImport,
}: ImportFormProps) {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const vaultStore = useStore(StoreName.Vault);
  const accountsStore = useStore(StoreName.Accounts);
  const categoriesStore = useStore(StoreName.Categories);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [sortField, setSortField] = useState<SortField>('sourceRow');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());
  const [bulkField, setBulkField] = useState<BulkField>('categoryName');
  const [bulkValue, setBulkValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedSourceRow, setSelectedSourceRow] = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [referenceEditor, setReferenceEditor] = useState<'account' | 'category' | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ImportFormValues>({
    defaultValues: { file: null as unknown as File },
    resolver: zodResolver(importFileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const preview = importStore.preview;
  const selectedFile = importStore.selectedFile;

  const submitReference = async (value: ReferenceFormValue) => {
    if (referenceEditor === 'account') {
      await accountsStore.create({ name: value.name, currency: value.currency ?? 'RUB' });
      if (accountsStore.mutationStatus === 'success') setReferenceEditor(null);
      return;
    }

    if (referenceEditor === 'category') {
      await categoriesStore.create({ name: value.name, kind: value.kind ?? 'expense' });
      if (categoriesStore.mutationStatus === 'success') setReferenceEditor(null);
    }
  };

  useEffect(() => {
    void accountsStore.load();
    void categoriesStore.load();
  }, [accountsStore, categoriesStore]);

  useEffect(() => {
    setRows(preview?.rows ?? []);
    setIsDirty(false);
    setFilter('all');
    setSortField('sourceRow');
    setSortDirection('asc');
    setSelectedRows(new Set());
    setBulkValue('');
    setSelectedSourceRow(
      preview?.format === 'generic-pdf' ? (preview.rows[0]?.sourceRow ?? null) : null,
    );
  }, [preview]);

  useEffect(() => {
    if (!selectedFile || !isPdfFile(selectedFile) || typeof URL.createObjectURL !== 'function') {
      setPdfPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPdfPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) setFileInputKey((value) => value + 1);
  }, [selectedFile]);

  const visibleRows = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      if (filter === 'invalid') return rowHasIssues(row);
      if (filter === 'valid') return !rowHasIssues(row);
      return true;
    });

    return [...filteredRows].sort((left, right) => {
      const leftValue =
        sortField === 'sourceRow'
          ? left.sourceRow
          : sortField === 'amount'
            ? left.amount
            : left.date;
      const rightValue =
        sortField === 'sourceRow'
          ? right.sourceRow
          : sortField === 'amount'
            ? right.amount
            : right.date;
      const leftMissing = leftValue === null || leftValue === '';
      const rightMissing = rightValue === null || rightValue === '';
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) return 0;
        return leftMissing ? 1 : -1;
      }
      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filter, rows, sortDirection, sortField]);
  const invalidRows = rows.filter(rowHasIssues).length;
  const selectedCount = selectedRows.size;
  const allVisibleRowsSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedRows.has(row.sourceRow));
  const bulkOptions = useMemo(() => {
    if (bulkField === 'categoryName') {
      return categoriesStore.categories.map((category) => ({
        value: category.name,
        label: `${category.name} · ${
          category.kind === 'income' ? t(I18nKey.CategoriesIncome) : t(I18nKey.CategoriesExpense)
        }`,
      }));
    }

    return accountsStore.accounts.map((account) => ({
      value: account.name,
      label: `${account.name} · ${account.currency}`,
    }));
  }, [accountsStore.accounts, bulkField, categoriesStore.categories, t]);
  const isProcessing = importStore.status === 'loading';
  const isConfirmed = importStore.job?.status === 'confirmed';
  const canConfirm = Boolean(
    preview &&
    rows.length > 0 &&
    !isDirty &&
    invalidRows === 0 &&
    !preview?.reviewRequired &&
    !isProcessing &&
    vaultStore.status === 'unlocked',
  );

  const submit = async () => {
    const job = await importStore.createJob();
    if (job) onJobCreated(job.id);
  };

  const updateRow = (sourceRow: number, field: keyof ImportRow, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.sourceRow === sourceRow
          ? {
              ...row,
              [field]: field === 'amount' ? (value === '' ? null : Number(value)) : value || null,
              ...(field === 'type' && value === 'transfer'
                ? { categoryName: null }
                : field === 'type' && value !== 'transfer'
                  ? { destinationAccountName: null }
                  : {}),
              valid: false,
              errors: ['EDIT_REQUIRES_RECHECK'],
            }
          : row,
      ),
    );
    setIsDirty(true);
  };

  const toggleRowSelection = (sourceRow: number) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(sourceRow)) next.delete(sourceRow);
      else next.add(sourceRow);
      return next;
    });
  };

  const toggleAllVisibleRows = () => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (allVisibleRowsSelected) visibleRows.forEach((row) => next.delete(row.sourceRow));
      else visibleRows.forEach((row) => next.add(row.sourceRow));
      return next;
    });
  };

  const applyBulkChange = () => {
    if (!bulkValue || selectedCount === 0) return;

    const hasApplicableRows = rows.some(
      (row) =>
        selectedRows.has(row.sourceRow) &&
        (bulkField === 'accountName' ||
          (bulkField === 'destinationAccountName' && row.type === 'transfer') ||
          (bulkField === 'categoryName' && row.type !== 'transfer')),
    );
    if (!hasApplicableRows) return;

    setRows((current) =>
      current.map((row) => {
        if (!selectedRows.has(row.sourceRow)) return row;
        if (bulkField === 'destinationAccountName' && row.type !== 'transfer') return row;
        if (bulkField === 'categoryName' && row.type === 'transfer') return row;
        return {
          ...row,
          [bulkField]: bulkValue,
          valid: false,
          errors: ['EDIT_REQUIRES_RECHECK'],
        };
      }),
    );
    setIsDirty(true);
    setBulkValue('');
  };

  const saveRows = async () => {
    const acknowledgeReview = Boolean(preview?.reviewRequired && !isDirty && invalidRows === 0);
    await importStore.updateRows(rows, acknowledgeReview);
    setIsDirty(false);
  };

  const step = !preview ? (isProcessing ? 1 : 0) : isDirty || invalidRows > 0 ? 2 : 3;
  const formatLabel = preview?.format.replace('finance-export-', '').replace('budgeto-', '') ?? '';
  const profileLabel = preview?.profileId
    ? `${preview.profileId}${preview.profileVersion ? ` · ${preview.profileVersion}` : ''}`
    : '';
  const profileConfidence =
    preview?.classifierConfidence === undefined
      ? ''
      : `${Math.round(preview.classifierConfidence * 100)}%`;
  const selectedSource = rows.find((row) => row.sourceRow === selectedSourceRow) ?? null;
  const selectedSourcePage = selectedSource?.sourceRef?.page ?? 1;
  const pdfPageUrl = pdfPreviewUrl ? `${pdfPreviewUrl}#page=${selectedSourcePage}` : null;

  const handleFile = (file: File | undefined, onChange: (value: File) => void) => {
    if (!file) return;
    onChange(file);
    importStore.selectFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>, onChange: (value: File) => void) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFile(event.dataTransfer.files[0], onChange);
  };

  return (
    <section className="import-panel">
      <ol className="import-flow" aria-label={t(I18nKey.ImportsTitle)}>
        {[
          I18nKey.ImportsStepTitle,
          I18nKey.ImportsStepDetect,
          I18nKey.ImportsStepReview,
          I18nKey.ImportsStepApply,
        ].map((stepKey, index) => (
          <li
            aria-current={index === step ? 'step' : undefined}
            className={index === step ? 'is-current' : ''}
            key={stepKey}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {t(stepKey)}
          </li>
        ))}
      </ol>
      <div className="import-step">
        <span className="step-number">{String(step + 1).padStart(2, '0')}</span>
        <div>
          <h2>{t(step === 0 ? I18nKey.ImportsStepTitle : I18nKey.ImportsStepReview)}</h2>
          <p className="panel-copy">
            {isProcessing ? t(I18nKey.ImportsProcessing) : t(I18nKey.ImportsStepDescription)}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(submit)}>
        <Controller
          control={control}
          name="file"
          render={({ field }) => (
            <div className="import-file-field">
              <span className="import-file-label">{t(I18nKey.ImportsFileLabel)}</span>
              <label
                className={`import-dropzone${isDragOver ? ' is-dragging' : ''}${
                  errors.file ? ' is-error' : ''
                }`}
                htmlFor="import-file-input"
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setIsDragOver(false);
                }}
                onDrop={(event) => handleDrop(event, field.onChange)}
              >
                <input
                  key={fileInputKey}
                  id="import-file-input"
                  accept=".xlsx,.xlsm,.csv,.pdf"
                  name={field.name}
                  ref={field.ref}
                  type="file"
                  aria-label={t(I18nKey.ImportsFileLabel)}
                  aria-invalid={errors.file ? 'true' : 'false'}
                  aria-describedby="import-file-help"
                  onBlur={field.onBlur}
                  onChange={(event) => handleFile(event.target.files?.[0], field.onChange)}
                />
                <span className="import-dropzone-title">
                  {isDragOver ? t(I18nKey.ImportsDropzoneActive) : t(I18nKey.ImportsDropzoneTitle)}
                </span>
                <span className="import-dropzone-hint">{t(I18nKey.ImportsDropzoneHint)}</span>
              </label>
              <span
                id="import-file-help"
                role={errors.file ? 'alert' : undefined}
                className={`import-file-help${errors.file ? ' is-error' : ''}`}
              >
                {translateValidationError(
                  errors.file?.message,
                  t,
                  I18nKey.ImportsValidationRequired,
                ) ?? t(I18nKey.ImportsFileHint)}
              </span>
            </div>
          )}
        />
        <div className="import-actions">
          <Button appearance="primary" dimension="m" disabled={isProcessing} type="submit">
            {t(I18nKey.ImportsPreparePreview)}
          </Button>
          <span className="selected-file">
            {importStore.selectedFile?.name ?? t(I18nKey.ImportsFileNotSelected)}
          </span>
        </div>
      </form>
      {isProcessing ? <StatusIndicator dimension="s" text={t(I18nKey.ImportsProcessing)} /> : null}
      {importStore.status === 'error' ? (
        <div className="import-error-state">
          <StatusIndicator
            dimension="s"
            text={
              importStore.errorCode === 'VAULT_KEY_REQUIRED'
                ? t(I18nKey.VaultKeyRequired)
                : importStore.job?.status === 'failed'
                  ? t(I18nKey.ImportsFailed)
                  : t(I18nKey.ImportsRestoreFailed)
            }
          />
          {importStore.job?.status === 'failed' ? (
            <Button appearance="secondary" dimension="s" onClick={onNewImport}>
              {t(I18nKey.ImportsChooseAnotherFile)}
            </Button>
          ) : (
            <Button appearance="secondary" dimension="s" onClick={() => importStore.retry()}>
              {t(I18nKey.ImportsRetry)}
            </Button>
          )}
        </div>
      ) : null}
      {importStore.result ? (
        <div className="import-result-state" role="status">
          <StatusIndicator dimension="s" text={t(I18nKey.ImportsImportComplete)} />
          <p>{t(I18nKey.ImportsCreatedCount, { count: importStore.result.created })}</p>
          <p>{t(I18nKey.ImportsSkippedCount, { count: importStore.result.skipped })}</p>
          <Button appearance="secondary" dimension="s" onClick={onNewImport}>
            {t(I18nKey.ImportsNewImport)}
          </Button>
        </div>
      ) : null}
      {preview ? (
        <div className="import-preview" role="region" aria-label={t(I18nKey.ImportsStepPreview)}>
          {!isConfirmed ? <VaultKeyPanel /> : null}
          <div className="section-heading section-heading--compact">
            <div className="import-preview-meta">
              <span className="section-kicker">{t(I18nKey.ImportsStepPreview)}</span>
              <h2>{t(I18nKey.ImportsPreviewReady)}</h2>
              <span className="field-muted">
                {t(I18nKey.ImportsDetectedFormat)}: {formatLabel.toUpperCase()}
              </span>
              {profileLabel ? (
                <span className="field-muted">
                  {t(I18nKey.ImportsDetectedProfile)}: {profileLabel}
                </span>
              ) : null}
              {profileConfidence ? (
                <span className="field-muted">
                  {t(I18nKey.ImportsProfileConfidence)}: {profileConfidence}
                </span>
              ) : null}
              {preview.reviewRequired ? (
                <span className="field-muted">{t(I18nKey.ImportsManualReviewRequired)}</span>
              ) : null}
            </div>
            <Badge appearance={invalidRows ? 'warning' : 'success'} dimension="m">
              {rows.length - invalidRows}/{rows.length}
            </Badge>
          </div>
          <p className="panel-copy">{t(I18nKey.ImportsPreviewDescription)}</p>
          {accountsStore.status === 'empty' ? (
            <div className="state-callout">
              <span>{t(I18nKey.ImportsNoAccounts)}</span>
              <Button
                appearance="secondary"
                dimension="s"
                onClick={() => setReferenceEditor('account')}
              >
                {t(I18nKey.AccountsAdd)}
              </Button>
            </div>
          ) : null}
          {categoriesStore.status === 'empty' ? (
            <div className="state-callout">
              <span>{t(I18nKey.ImportsNoCategories)}</span>
              <Button
                appearance="secondary"
                dimension="s"
                onClick={() => setReferenceEditor('category')}
              >
                {t(I18nKey.CategoriesAdd)}
              </Button>
            </div>
          ) : null}
          {accountsStore.status === 'error' || categoriesStore.status === 'error' ? (
            <div className="state-callout state-callout--error">
              <span>{t(I18nKey.ImportsReferencesLoadError)}</span>
              <Button
                appearance="secondary"
                dimension="s"
                onClick={() => {
                  void accountsStore.retry();
                  void categoriesStore.retry();
                }}
              >
                {t(I18nKey.ImportsRetry)}
              </Button>
            </div>
          ) : null}
          <div className="import-preview-toolbar">
            <div className="import-toolbar-controls">
              <label className="filter-select">
                {t(I18nKey.ImportsFilter)}
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as RowFilter)}
                >
                  <option value="all">{t(I18nKey.ImportsFilterAll)}</option>
                  <option value="invalid">{t(I18nKey.ImportsFilterInvalid)}</option>
                  <option value="valid">{t(I18nKey.ImportsFilterValid)}</option>
                </select>
              </label>
              <label className="filter-select">
                {t(I18nKey.ImportsSort)}
                <select
                  value={`${sortField}:${sortDirection}`}
                  onChange={(event) => {
                    const [field, direction] = event.target.value.split(':') as [
                      SortField,
                      SortDirection,
                    ];
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                >
                  <option value="sourceRow:asc">{t(I18nKey.ImportsSortSourceRow)}</option>
                  <option value="date:asc">
                    {t(I18nKey.ImportsSortDate)} · {t(I18nKey.ImportsSortAscending)}
                  </option>
                  <option value="date:desc">
                    {t(I18nKey.ImportsSortDate)} · {t(I18nKey.ImportsSortDescending)}
                  </option>
                  <option value="amount:asc">
                    {t(I18nKey.ImportsSortAmount)} · {t(I18nKey.ImportsSortAscending)}
                  </option>
                  <option value="amount:desc">
                    {t(I18nKey.ImportsSortAmount)} · {t(I18nKey.ImportsSortDescending)}
                  </option>
                </select>
              </label>
            </div>
            <span className="import-row-count">
              {t(I18nKey.ImportsSelectedCount, { count: selectedCount })} · {visibleRows.length}/
              {rows.length}
            </span>
          </div>
          <div className="import-bulk-toolbar">
            <label className="import-select-all import-select-all--toolbar">
              <input
                type="checkbox"
                checked={allVisibleRowsSelected}
                disabled={isProcessing || isConfirmed || visibleRows.length === 0}
                aria-label={t(I18nKey.ImportsSelectAll)}
                onChange={toggleAllVisibleRows}
              />
              <span>{t(I18nKey.ImportsSelectAll)}</span>
            </label>
            <label className="filter-select">
              {t(I18nKey.ImportsBulkField)}
              <select
                disabled={isProcessing || isConfirmed}
                value={bulkField}
                onChange={(event) => {
                  setBulkField(event.target.value as BulkField);
                  setBulkValue('');
                }}
              >
                <option value="accountName">{t(I18nKey.ImportsBulkAccount)}</option>
                <option value="destinationAccountName">{t(I18nKey.ImportsBulkDestination)}</option>
                <option value="categoryName">{t(I18nKey.ImportsBulkCategory)}</option>
              </select>
            </label>
            <label className="filter-select">
              {t(I18nKey.ImportsBulkValue)}
              <select
                disabled={isProcessing || isConfirmed || selectedCount === 0}
                value={bulkValue}
                onChange={(event) => setBulkValue(event.target.value)}
              >
                <option value="">{t(I18nKey.ImportsBulkValue)}</option>
                {bulkOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              appearance="secondary"
              dimension="s"
              disabled={isProcessing || isConfirmed || selectedCount === 0 || !bulkValue}
              onClick={applyBulkChange}
            >
              {t(I18nKey.ImportsApplyToSelected)}
            </Button>
          </div>
          {visibleRows.length ? (
            <div className="import-review-layout">
              <div className="import-table-panel">
                <h3 className="import-review-table-title">{t(I18nKey.ImportsReviewTable)}</h3>
                <div className="table-scroll">
                  <table className="import-data-table">
                    <thead>
                      <tr>
                        <th>{t(I18nKey.ImportsSourceRow)}</th>
                        <th>{t(I18nKey.ImportsOperationAndAmount)}</th>
                        <th>{t(I18nKey.ImportsAccountsAndCategory)}</th>
                        <th>{t(I18nKey.ImportsNote)}</th>
                        <th>{t(I18nKey.ImportsReviewStatus)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr
                          key={row.sourceRow}
                          className={`${rowHasIssues(row) ? 'is-invalid' : ''}${
                            selectedSourceRow === row.sourceRow ? ' is-source-selected' : ''
                          }`}
                        >
                          <td
                            data-label={t(I18nKey.ImportsSourceRow)}
                            className="import-source-cell"
                          >
                            <button
                              className="import-source-link"
                              type="button"
                              aria-label={t(I18nKey.ImportsSourceRowLink, { row: row.sourceRow })}
                              onClick={() => setSelectedSourceRow(row.sourceRow)}
                            >
                              <strong>{row.sourceRow}</strong>
                              <span>
                                {row.sourceRef?.kind === 'pdf' && row.sourceRef.page
                                  ? t(I18nKey.ImportsSourcePage, { page: row.sourceRef.page })
                                  : (row.sourceRef?.sheet ?? '—')}
                              </span>
                            </button>
                            <label className="import-row-select">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(row.sourceRow)}
                                disabled={isProcessing || isConfirmed}
                                aria-label={`${t(I18nKey.ImportsSelectRows)} ${row.sourceRow}`}
                                onChange={() => toggleRowSelection(row.sourceRow)}
                              />
                            </label>
                            <input
                              disabled={isProcessing || isConfirmed}
                              aria-label={`${t(I18nKey.Date)} ${row.sourceRow}`}
                              value={row.date ?? ''}
                              onChange={(event) =>
                                updateRow(row.sourceRow, 'date', event.target.value)
                              }
                            />
                          </td>
                          <td data-label={t(I18nKey.ImportsOperationAndAmount)}>
                            <div className="import-operation-fields">
                              <select
                                disabled={isProcessing || isConfirmed}
                                aria-label={`${t(I18nKey.Operation)} ${row.sourceRow}`}
                                value={row.type ?? ''}
                                onChange={(event) =>
                                  updateRow(row.sourceRow, 'type', event.target.value)
                                }
                              >
                                <option value="">{t(I18nKey.ImportsTypeUnknown)}</option>
                                {typeOptions.map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {t(label)}
                                  </option>
                                ))}
                              </select>
                              <input
                                disabled={isProcessing || isConfirmed}
                                aria-label={`${t(I18nKey.Amount)} ${row.sourceRow}`}
                                inputMode="decimal"
                                value={row.amount ?? ''}
                                onChange={(event) =>
                                  updateRow(row.sourceRow, 'amount', event.target.value)
                                }
                              />
                            </div>
                          </td>
                          <td data-label={t(I18nKey.ImportsAccountsAndCategory)}>
                            <div className="import-reference-fields">
                              <select
                                disabled={isProcessing || isConfirmed}
                                aria-label={`${t(I18nKey.Account)} ${row.sourceRow}`}
                                value={row.accountName ?? ''}
                                onChange={(event) =>
                                  updateRow(row.sourceRow, 'accountName', event.target.value)
                                }
                              >
                                <option value="">{t(I18nKey.ImportsSelectAccount)}</option>
                                {row.accountName &&
                                !accountsStore.accounts.some(
                                  (account) => account.name === row.accountName,
                                ) ? (
                                  <option value={row.accountName} disabled>
                                    {row.accountName} — {t(I18nKey.ImportsReferenceNotFound)}
                                  </option>
                                ) : null}
                                {accountsStore.accounts.map((account) => (
                                  <option key={account.id} value={account.name}>
                                    {account.name} · {account.currency}
                                  </option>
                                ))}
                              </select>
                              {row.type === 'transfer' ? (
                                <select
                                  disabled={isProcessing || isConfirmed}
                                  aria-label={`${t(I18nKey.ImportsDestinationAccount)} ${row.sourceRow}`}
                                  value={row.destinationAccountName ?? ''}
                                  onChange={(event) =>
                                    updateRow(
                                      row.sourceRow,
                                      'destinationAccountName',
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">{t(I18nKey.ImportsSelectDestination)}</option>
                                  {row.destinationAccountName &&
                                  !accountsStore.accounts.some(
                                    (account) => account.name === row.destinationAccountName,
                                  ) ? (
                                    <option value={row.destinationAccountName} disabled>
                                      {row.destinationAccountName} —{' '}
                                      {t(I18nKey.ImportsReferenceNotFound)}
                                    </option>
                                  ) : null}
                                  {accountsStore.accounts.map((account) => (
                                    <option key={account.id} value={account.name}>
                                      {account.name} · {account.currency}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                              {row.type === 'transfer' ? (
                                <span className="field-muted">
                                  {t(I18nKey.ImportsCategoryNotUsed)}
                                </span>
                              ) : (
                                <select
                                  disabled={isProcessing || isConfirmed || !row.type}
                                  aria-label={`${t(I18nKey.Category)} ${row.sourceRow}`}
                                  value={row.categoryName ?? ''}
                                  onChange={(event) =>
                                    updateRow(row.sourceRow, 'categoryName', event.target.value)
                                  }
                                >
                                  <option value="">{t(I18nKey.ImportsSelectCategory)}</option>
                                  {row.categoryName &&
                                  !categoriesStore
                                    .byKind(row.type as CategoryKind)
                                    .some((category) => category.name === row.categoryName) ? (
                                    <option value={row.categoryName} disabled>
                                      {row.categoryName} — {t(I18nKey.ImportsReferenceNotFound)}
                                    </option>
                                  ) : null}
                                  {row.type
                                    ? categoriesStore
                                        .byKind(row.type as CategoryKind)
                                        .map((category) => (
                                          <option key={category.id} value={category.name}>
                                            {category.name}
                                          </option>
                                        ))
                                    : null}
                                </select>
                              )}
                            </div>
                          </td>
                          <td data-label={t(I18nKey.ImportsNote)}>
                            <input
                              disabled={isProcessing || isConfirmed}
                              aria-label={`${t(I18nKey.ImportsNote)} ${row.sourceRow}`}
                              value={row.note ?? ''}
                              onChange={(event) =>
                                updateRow(row.sourceRow, 'note', event.target.value)
                              }
                            />
                          </td>
                          <td data-label={t(I18nKey.ImportsReviewStatus)}>
                            <div className="import-row-status">
                              <span>
                                {rowHasIssues(row)
                                  ? t(I18nKey.ImportsRowInvalid)
                                  : t(I18nKey.Connected)}
                              </span>
                              {row.errors.length ? (
                                <ul aria-label={t(I18nKey.ImportsErrors)}>
                                  {row.errors.map((code) => (
                                    <li key={code}>{issueText(code, t)}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {row.warnings.length ? (
                                <ul
                                  className="import-row-warnings"
                                  aria-label={t(I18nKey.ImportsWarnings)}
                                >
                                  {row.warnings.map((code) => (
                                    <li key={code}>{issueText(code, t)}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {preview.format === 'generic-pdf' ? (
                <aside
                  className="import-source-preview"
                  aria-label={t(I18nKey.ImportsSourcePreviewTitle)}
                >
                  <div className="import-source-preview-heading">
                    <span className="section-kicker">{t(I18nKey.ImportsSourceHighlight)}</span>
                    <h3>{t(I18nKey.ImportsSourcePreviewTitle)}</h3>
                    <p>{t(I18nKey.ImportsSourcePreviewDescription)}</p>
                  </div>
                  {pdfPageUrl ? (
                    <iframe
                      className="import-pdf-frame"
                      key={pdfPageUrl}
                      title={`${selectedFile?.name ?? 'PDF'} — ${t(I18nKey.ImportsSourcePage, {
                        page: selectedSourcePage,
                      })}`}
                      src={pdfPageUrl}
                    />
                  ) : (
                    <div className="state-callout">
                      {t(I18nKey.ImportsSourcePreviewUnavailable)}
                    </div>
                  )}
                  {selectedSource ? (
                    <div className="import-source-editor">
                      <div className="import-source-meta">
                        <strong>
                          {t(I18nKey.ImportsSourceRowLink, { row: selectedSource.sourceRow })}
                        </strong>
                        <span>
                          {t(I18nKey.ImportsSourcePage, { page: selectedSourcePage })}
                          {selectedSource.sourceRef?.record
                            ? ` · ${t(I18nKey.ImportsSourceRecord, {
                                record: selectedSource.sourceRef.record,
                              })}`
                            : ''}
                        </span>
                      </div>
                      <span className="import-source-editor-label">
                        {t(I18nKey.ImportsSourceEdit)}
                      </span>
                      <div className="import-source-editor-grid">
                        <label>
                          {t(I18nKey.Date)}
                          <input
                            disabled={isProcessing || isConfirmed}
                            aria-label={`${t(I18nKey.Date)} ${selectedSource.sourceRow} — ${t(
                              I18nKey.ImportsSourceEdit,
                            )}`}
                            value={selectedSource.date ?? ''}
                            onChange={(event) =>
                              updateRow(selectedSource.sourceRow, 'date', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          {t(I18nKey.Amount)}
                          <input
                            disabled={isProcessing || isConfirmed}
                            aria-label={`${t(I18nKey.Amount)} ${selectedSource.sourceRow} — ${t(
                              I18nKey.ImportsSourceEdit,
                            )}`}
                            inputMode="decimal"
                            value={selectedSource.amount ?? ''}
                            onChange={(event) =>
                              updateRow(selectedSource.sourceRow, 'amount', event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <label>
                        {t(I18nKey.ImportsNote)}
                        <input
                          disabled={isProcessing || isConfirmed}
                          aria-label={`${t(I18nKey.ImportsNote)} ${selectedSource.sourceRow} — ${t(
                            I18nKey.ImportsSourceEdit,
                          )}`}
                          value={selectedSource.note ?? ''}
                          onChange={(event) =>
                            updateRow(selectedSource.sourceRow, 'note', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          ) : (
            <p className="state-callout">{t(I18nKey.ImportsNoRows)}</p>
          )}
          {!isConfirmed ? (
            <div className="import-actions">
              <Button
                appearance="secondary"
                dimension="m"
                disabled={
                  isProcessing || (!isDirty && (!preview.reviewRequired || invalidRows > 0))
                }
                onClick={saveRows}
              >
                {isProcessing
                  ? t(I18nKey.ImportsSaving)
                  : preview.reviewRequired && !isDirty && invalidRows === 0
                    ? t(I18nKey.ImportsAcknowledgeReview)
                    : t(I18nKey.ImportsSaveRows)}
              </Button>
              <Button
                appearance="primary"
                dimension="m"
                disabled={!canConfirm}
                onClick={() => importStore.confirm()}
              >
                {t(I18nKey.ImportsConfirm)}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <ReferenceEditorModal
        mode={referenceEditor ?? 'account'}
        error={
          (referenceEditor === 'account' ? accountsStore : categoriesStore).mutationStatus ===
          'error'
            ? t(I18nKey.ReferencesMutationError)
            : undefined
        }
        onClose={() => setReferenceEditor(null)}
        onSubmit={(value) => {
          void submitReference(value);
        }}
        open={referenceEditor !== null}
        saving={
          accountsStore.mutationStatus === 'saving' || categoriesStore.mutationStatus === 'saving'
        }
      />
    </section>
  );
});

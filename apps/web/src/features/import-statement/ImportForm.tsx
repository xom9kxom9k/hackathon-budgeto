import { Badge, Button, FileInputField, StatusIndicator } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { ImportRow } from '@/shared/services/ImportService';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';

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
    .refine((file) => /\.(xlsx|xlsm)$/i.test(file.name), I18nKey.ImportsValidationType)
    .refine((file) => file.size <= maxFileSize, I18nKey.ImportsValidationSize),
});
type ImportFormValues = z.infer<typeof importFileSchema>;
type RowFilter = 'all' | 'invalid' | 'valid';

function issueText(code: string, t: (key: I18nKey) => string): string {
  return t(issueTranslations[code] ?? I18nKey.ImportsRowInvalid);
}

function rowHasIssues(row: ImportRow): boolean {
  return !row.valid || row.errors.length > 0;
}

export const ImportForm = observer(function ImportForm() {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [isDirty, setIsDirty] = useState(false);
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

  useEffect(() => {
    setRows(preview?.rows ?? []);
    setIsDirty(false);
    setFilter('all');
  }, [preview]);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === 'invalid') return rowHasIssues(row);
        if (filter === 'valid') return !rowHasIssues(row);
        return true;
      }),
    [filter, rows],
  );
  const invalidRows = rows.filter(rowHasIssues).length;
  const isProcessing = importStore.status === 'loading';
  const canConfirm = Boolean(
    preview && rows.length > 0 && !isDirty && invalidRows === 0 && !isProcessing,
  );

  const submit = async () => {
    await importStore.createJob();
  };

  const updateRow = (sourceRow: number, field: keyof ImportRow, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.sourceRow === sourceRow
          ? {
              ...row,
              [field]: field === 'amount' ? (value === '' ? null : Number(value)) : value || null,
              valid: false,
              errors: ['EDIT_REQUIRES_RECHECK'],
            }
          : row,
      ),
    );
    setIsDirty(true);
  };

  const saveRows = async () => {
    await importStore.updateRows(rows);
    setIsDirty(false);
  };

  const step = !preview ? (isProcessing ? 1 : 0) : isDirty || invalidRows > 0 ? 2 : 3;

  return (
    <section className="import-panel">
      <ol className="import-flow" aria-label={t(I18nKey.ImportsTitle)}>
        {[
          I18nKey.ImportsStepTitle,
          I18nKey.ImportsStepDetect,
          I18nKey.ImportsStepReview,
          I18nKey.ImportsStepApply,
        ].map((stepKey, index) => (
          <li className={index === step ? 'is-current' : ''} key={stepKey}>
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
            <FileInputField
              accept=".xlsx,.xlsm"
              dimension="m"
              label={t(I18nKey.ImportsFileLabel)}
              name={field.name}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  field.onChange(file);
                  importStore.selectFile(file);
                }
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              status={errors.file ? 'error' : undefined}
              title={t(I18nKey.ImportsFileLabel)}
              extraText={
                translateValidationError(
                  errors.file?.message,
                  t,
                  I18nKey.ImportsValidationRequired,
                ) ?? t(I18nKey.ImportsFileHint)
              }
            />
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
        <StatusIndicator dimension="s" text={t(I18nKey.ImportsFailed)} />
      ) : null}
      {preview ? (
        <div className="import-preview" role="region" aria-label={t(I18nKey.ImportsStepPreview)}>
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">{t(I18nKey.ImportsStepPreview)}</span>
              <h2>{t(I18nKey.ImportsPreviewReady)}</h2>
            </div>
            <Badge appearance={invalidRows ? 'warning' : 'success'} dimension="m">
              {rows.length - invalidRows}/{rows.length}
            </Badge>
          </div>
          <p className="panel-copy">{t(I18nKey.ImportsPreviewDescription)}</p>
          <div className="import-preview-toolbar">
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
            <span className="import-row-count">
              {visibleRows.length}/{rows.length}
            </span>
          </div>
          {visibleRows.length ? (
            <div className="table-scroll">
              <table className="import-data-table">
                <thead>
                  <tr>
                    <th>{t(I18nKey.ImportsSourceRow)}</th>
                    <th>{t(I18nKey.Date)}</th>
                    <th>{t(I18nKey.Operation)}</th>
                    <th>{t(I18nKey.Amount)}</th>
                    <th>{t(I18nKey.Account)}</th>
                    <th>{t(I18nKey.ImportsDestinationAccount)}</th>
                    <th>{t(I18nKey.Category)}</th>
                    <th>{t(I18nKey.ImportsNote)}</th>
                    <th>{t(I18nKey.Status)}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.sourceRow}
                      className={rowHasIssues(row) ? 'is-invalid' : undefined}
                    >
                      <td data-label={t(I18nKey.ImportsSourceRow)}>{row.sourceRow}</td>
                      <td data-label={t(I18nKey.Date)}>
                        <input
                          aria-label={`${t(I18nKey.Date)} ${row.sourceRow}`}
                          value={row.date ?? ''}
                          onChange={(event) => updateRow(row.sourceRow, 'date', event.target.value)}
                        />
                      </td>
                      <td data-label={t(I18nKey.Operation)}>
                        <select
                          aria-label={`${t(I18nKey.Operation)} ${row.sourceRow}`}
                          value={row.type ?? ''}
                          onChange={(event) => updateRow(row.sourceRow, 'type', event.target.value)}
                        >
                          <option value="">{t(I18nKey.ImportsTypeUnknown)}</option>
                          {typeOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {t(label)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label={t(I18nKey.Amount)}>
                        <input
                          aria-label={`${t(I18nKey.Amount)} ${row.sourceRow}`}
                          inputMode="decimal"
                          value={row.amount ?? ''}
                          onChange={(event) =>
                            updateRow(row.sourceRow, 'amount', event.target.value)
                          }
                        />
                      </td>
                      <td data-label={t(I18nKey.Account)}>
                        <input
                          aria-label={`${t(I18nKey.Account)} ${row.sourceRow}`}
                          value={row.accountName ?? ''}
                          onChange={(event) =>
                            updateRow(row.sourceRow, 'accountName', event.target.value)
                          }
                        />
                      </td>
                      <td data-label={t(I18nKey.ImportsDestinationAccount)}>
                        <input
                          aria-label={`${t(I18nKey.ImportsDestinationAccount)} ${row.sourceRow}`}
                          value={row.destinationAccountName ?? ''}
                          onChange={(event) =>
                            updateRow(row.sourceRow, 'destinationAccountName', event.target.value)
                          }
                        />
                      </td>
                      <td data-label={t(I18nKey.Category)}>
                        <input
                          aria-label={`${t(I18nKey.Category)} ${row.sourceRow}`}
                          value={row.categoryName ?? ''}
                          onChange={(event) =>
                            updateRow(row.sourceRow, 'categoryName', event.target.value)
                          }
                        />
                      </td>
                      <td data-label={t(I18nKey.ImportsNote)}>
                        <input
                          aria-label={`${t(I18nKey.ImportsNote)} ${row.sourceRow}`}
                          value={row.note ?? ''}
                          onChange={(event) => updateRow(row.sourceRow, 'note', event.target.value)}
                        />
                      </td>
                      <td data-label={t(I18nKey.Status)}>
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
          ) : (
            <p className="state-callout">{t(I18nKey.ImportsNoRows)}</p>
          )}
          <div className="import-actions">
            <Button
              appearance="secondary"
              dimension="m"
              disabled={!isDirty || isProcessing}
              onClick={saveRows}
            >
              {isProcessing ? t(I18nKey.ImportsSaving) : t(I18nKey.ImportsSaveRows)}
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
        </div>
      ) : null}
    </section>
  );
});

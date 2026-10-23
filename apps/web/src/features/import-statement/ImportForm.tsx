import { Badge, Button, FileInputField, StatusIndicator } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { ImportRow } from '@/shared/services/ImportService';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';

const maxFileSize = 8 * 1024 * 1024;
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

export const ImportForm = observer(function ImportForm() {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const [rows, setRows] = useState<ImportRow[]>([]);
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
  useEffect(() => {
    setRows(importStore.preview?.rows ?? []);
  }, [importStore.preview]);
  const submit = async () => {
    await importStore.createJob();
  };
  const updateRow = (index: number, field: keyof ImportRow, value: string) =>
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === 'amount' ? Number(value) || null : value,
              valid: false,
              errors: ['EDIT_REQUIRES_RECHECK'],
            }
          : row,
      ),
    );
  const preview = importStore.preview;
  return (
    <section className="import-panel">
      <ol className="import-flow" aria-label={t(I18nKey.ImportsTitle)}>
        {[
          I18nKey.ImportsStepTitle,
          I18nKey.ImportsStepDetect,
          I18nKey.ImportsStepReview,
          I18nKey.ImportsStepApply,
        ].map((step, index) => (
          <li className={index === 0 || preview ? 'is-current' : ''} key={step}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {t(step)}
          </li>
        ))}
      </ol>
      <div className="import-step">
        <span className="step-number">01</span>
        <div>
          <h2>{t(I18nKey.ImportsStepTitle)}</h2>
          <p className="panel-copy">{t(I18nKey.ImportsStepDescription)}</p>
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
          <Button
            appearance="primary"
            dimension="m"
            disabled={importStore.status === 'loading'}
            type="submit"
          >
            {t(I18nKey.ImportsPreparePreview)}
          </Button>
          <span className="selected-file">
            {importStore.selectedFile?.name ?? t(I18nKey.ImportsFileNotSelected)}
          </span>
        </div>
      </form>
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
            <Badge appearance="success" dimension="m">
              {preview.valid}/{preview.total}
            </Badge>
          </div>
          <p className="panel-copy">{t(I18nKey.ImportsPreviewDescription)}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t(I18nKey.Date)}</th>
                  <th>{t(I18nKey.Operation)}</th>
                  <th>{t(I18nKey.Amount)}</th>
                  <th>{t(I18nKey.Account)}</th>
                  <th>{t(I18nKey.Category)}</th>
                  <th>{t(I18nKey.Status)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.sourceRow}>
                    <td>
                      <input
                        aria-label={`${t(I18nKey.Date)} ${row.sourceRow}`}
                        value={row.date ?? ''}
                        onChange={(event) => updateRow(index, 'date', event.target.value)}
                      />
                    </td>
                    <td>{row.type ?? '—'}</td>
                    <td>
                      <input
                        aria-label={`${t(I18nKey.Amount)} ${row.sourceRow}`}
                        value={row.amount ?? ''}
                        onChange={(event) => updateRow(index, 'amount', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${t(I18nKey.Account)} ${row.sourceRow}`}
                        value={row.accountName ?? ''}
                        onChange={(event) => updateRow(index, 'accountName', event.target.value)}
                      />
                    </td>
                    <td>{row.categoryName ?? '—'}</td>
                    <td>{row.valid ? t(I18nKey.Connected) : t(I18nKey.ImportsRowInvalid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-actions">
            <Button
              appearance="secondary"
              dimension="m"
              disabled={importStore.status === 'loading'}
              onClick={() => importStore.updateRows(rows)}
            >
              {t(I18nKey.ImportsSaveRows)}
            </Button>
            <Button
              appearance="primary"
              dimension="m"
              disabled={preview.invalid > 0 || importStore.status === 'loading'}
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

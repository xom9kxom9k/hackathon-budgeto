import { Badge, Button, FileInputField, StatusIndicator } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

const maxFileSize = 20 * 1024 * 1024;

export const importFileSchema = z.object({
  file: z
    .custom<File>(
      (value) => typeof File !== 'undefined' && value instanceof File,
      I18nKey.ImportsValidationRequired,
    )
    .refine((file) => /\.(csv|xlsx)$/i.test(file.name), I18nKey.ImportsValidationType)
    .refine((file) => file.size <= maxFileSize, I18nKey.ImportsValidationSize),
});

type ImportFormValues = z.infer<typeof importFileSchema>;

export const ImportForm = observer(function ImportForm() {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ImportFormValues>({
    defaultValues: { file: null as unknown as File },
    resolver: zodResolver(importFileSchema),
    mode: 'onChange',
  });
  const selectedFile = watch('file');
  const errorKey = errors.file?.message as I18nKey | undefined;

  const onSubmit = ({ file }: ImportFormValues) => {
    importStore.selectFile(file);
    importStore.setPreview({
      fileName: file.name,
      fileSize: file.size,
      extension: file.name.split('.').pop()?.toLowerCase() ?? '',
    });
  };

  return (
    <section className="import-panel">
      <ol className="import-flow" aria-label={t(I18nKey.ImportsTitle)}>
        {[
          I18nKey.ImportsStepTitle,
          I18nKey.ImportsStepDetect,
          I18nKey.ImportsStepReview,
          I18nKey.ImportsStepApply,
        ].map((step, index) => (
          <li className={index === 0 || importStore.preview ? 'is-current' : ''} key={step}>
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          control={control}
          name="file"
          render={({ field }) => (
            <FileInputField
              accept=".csv,.xlsx"
              dimension="m"
              label={t(I18nKey.ImportsFileLabel)}
              name={field.name}
              onChange={(event) => {
                field.onChange(event.target.files?.[0] ?? null);
                importStore.clear();
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              status={errorKey ? 'error' : undefined}
              title={t(I18nKey.ImportsFileLabel)}
              extraText={errorKey ? t(errorKey) : t(I18nKey.ImportsFileHint)}
            />
          )}
        />
        <div className="import-actions">
          <Button appearance="primary" dimension="m" disabled={!selectedFile} type="submit">
            {t(I18nKey.ImportsPreparePreview)}
          </Button>
          <span className="selected-file">
            {selectedFile?.name ?? t(I18nKey.ImportsFileNotSelected)}
          </span>
        </div>
      </form>
      {importStore.preview ? (
        <div className="import-preview" role="status">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">{t(I18nKey.ImportsStepPreview)}</span>
              <h2>{t(I18nKey.ImportsPreviewReady)}</h2>
            </div>
            <Badge appearance="success" dimension="m">
              {t(I18nKey.ImportsDetectedFormat)}: {importStore.preview.extension.toUpperCase()}
            </Badge>
          </div>
          <StatusIndicator dimension="s" text={t(I18nKey.ImportsLocalOnly)} />
          <p className="panel-copy">{t(I18nKey.ImportsPreviewDescription)}</p>
          <dl className="detail-definition-list">
            <div>
              <dt>{t(I18nKey.ImportsFileLabel)}</dt>
              <dd>{importStore.preview.fileName}</dd>
            </div>
            <div>
              <dt>{t(I18nKey.Amount)}</dt>
              <dd>{Math.round(importStore.preview.fileSize / 1024)} KB</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
});

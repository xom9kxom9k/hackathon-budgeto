import { FileInputField, Button } from '@admiral-ds/react-ui';
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
        <div className="state-callout state-callout--success" role="status">
          <strong>{t(I18nKey.ImportsPreviewReady)}</strong>
          <span>{t(I18nKey.ImportsPreviewDescription)}</span>
        </div>
      ) : null}
    </section>
  );
});

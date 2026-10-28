import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { parseAsString, useQueryState } from 'nuqs';

import { I18nKey } from '@/shared/i18n';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';
import { ImportForm } from '@/features/import-statement/ImportForm';
import { observer } from 'mobx-react-lite';
import { Button, T } from '@admiral-ds/react-ui';

export const ImportsPage = observer(function ImportsPage() {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const [jobId, setJobId] = useQueryState('job', parseAsString);

  useEffect(() => {
    importStore.clearSelectedFile();
    return () => importStore.clearSelectedFile();
  }, [importStore]);

  useEffect(() => {
    if (jobId) void importStore.restoreJob(jobId);
    void importStore.loadHistory();
  }, [importStore, jobId]);

  const startNewImport = () => {
    importStore.clear();
    void setJobId(null);
  };

  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationImports) },
          ]}
        />
      }
      description={t(I18nKey.ImportsDescription)}
      kicker={t(I18nKey.ImportsKicker)}
      title={t(I18nKey.ImportsTitle)}
    >
      <ImportForm onJobCreated={(id) => void setJobId(id)} onNewImport={startNewImport} />
      {importStore.history.length ? (
        <section className="plain-panel import-history-panel">
          <span className="section-kicker">{t(I18nKey.ImportsHistoryKicker)}</span>
          <T font="Header/H4" as="h2">
            {t(I18nKey.ImportsHistoryTitle)}
          </T>
          <div className="import-history-list">
            {importStore.history.map((item) => (
              <div className="import-history-row" key={item.id}>
                <div className="import-history-file">
                  <strong>{item.fileName}</strong>
                  <span className="import-history-meta">
                    {item.status} · {item.rowCount}
                  </span>
                </div>
                <div className="import-history-actions">
                  {item.status === 'failed' ? (
                    <Button
                      appearance="secondary"
                      dimension="s"
                      onClick={() => void importStore.retryJob(item.id)}
                    >
                      Retry
                    </Button>
                  ) : null}
                  <Button
                    appearance="tertiary"
                    dimension="s"
                    onClick={() => void setJobId(item.id)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageIntro>
  );
});

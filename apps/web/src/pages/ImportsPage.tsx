import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { parseAsString, useQueryState } from 'nuqs';

import { I18nKey } from '@/shared/i18n';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';
import { ImportForm } from '@/features/import-statement/ImportForm';

export function ImportsPage() {
  const { t } = useTranslation();
  const importStore = useStore(StoreName.Import);
  const [jobId, setJobId] = useQueryState('job', parseAsString);

  useEffect(() => {
    if (jobId) void importStore.restoreJob(jobId);
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
    </PageIntro>
  );
}

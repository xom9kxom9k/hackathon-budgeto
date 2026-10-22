import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { PageIntro } from '@/shared/ui/PageIntro';
import { ImportForm } from '@/features/import-statement/ImportForm';

export function ImportsPage() {
  const { t } = useTranslation();

  return (
    <PageIntro
      description={t(I18nKey.ImportsDescription)}
      kicker={t(I18nKey.ImportsKicker)}
      title={t(I18nKey.ImportsTitle)}
    >
      <ImportForm />
    </PageIntro>
  );
}

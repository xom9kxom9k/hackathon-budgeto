import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { PageIntro } from '@/shared/ui/PageIntro';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';

export const TransactionsPage = observer(function TransactionsPage() {
  const { t } = useTranslation();
  const overviewStore = useStore(StoreName.Overview);

  return (
    <PageIntro
      description={t(I18nKey.TransactionsDescription)}
      kicker={t(I18nKey.TransactionsKicker)}
      title={t(I18nKey.TransactionsTitle)}
    >
      <section className="content-section">
        <TransactionTable transactions={overviewStore.transactions} />
      </section>
    </PageIntro>
  );
});

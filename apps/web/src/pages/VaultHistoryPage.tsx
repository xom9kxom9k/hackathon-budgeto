import {
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  StatusIndicator,
  T,
} from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';
import { VaultKeyPanel } from '@/shared/ui/VaultKeyPanel';

export const VaultHistoryPage = observer(function VaultHistoryPage() {
  const { t } = useTranslation();
  const vault = useStore(StoreName.Vault);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    void vault.loadEvents();
  }, [vault]);

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
  };

  const selectedEvent = vault.events.find((event) => event.id === selectedEventId) ?? null;

  async function openEvent(eventId: string) {
    setSelectedEventId(eventId);
    setSnapshot(null);
    const event = vault.events.find((item) => item.id === eventId);
    if (!event || vault.status !== 'unlocked') return;
    try {
      setSnapshot(await vault.decryptEvent(event));
    } catch {
      setSnapshot(null);
    }
  }

  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationVaultHistory) },
          ]}
        />
      }
      description={t(I18nKey.VaultDescription)}
      kicker={t(I18nKey.VaultKicker)}
      title={t(I18nKey.VaultTitle)}
    >
      <VaultKeyPanel />
      <section className="timeline-panel">
        {vault.events.length === 0 ? (
          <div className="state-callout">{t(I18nKey.EmptyState)}</div>
        ) : (
          vault.events.map((event) => (
            <article className="timeline-item" key={event.id}>
              <div>
                <strong>{t(I18nKey.VaultEventSequence, { sequence: event.sequence })}</strong>
                <p>{new Date(event.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <StatusIndicator
                  dimension="s"
                  text={
                    vault.integrity?.valid
                      ? t(I18nKey.VaultIntegrityValid)
                      : t(I18nKey.VaultIntegrityUnavailable)
                  }
                />
                <p>{t(I18nKey.VaultEventSource, { row: event.importRow ?? '—' })}</p>
                <code className="vault-event-hash">{event.eventHash}</code>
                <div className="page-intro-actions">
                  <Button appearance="tertiary" dimension="s" onClick={() => void copyId(event.id)}>
                    {t(I18nKey.VaultCopyId)}
                  </Button>
                  <Button
                    appearance="tertiary"
                    dimension="s"
                    onClick={() => void openEvent(event.id)}
                  >
                    {t(I18nKey.OpenDetails)}
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
      <section className="plain-panel plain-panel--accent">
        <span className="section-kicker">{t(I18nKey.VaultIntegrityKicker)}</span>
        <T font="Header/H5" as="h2">
          {t(I18nKey.VaultIntegrityTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p>
        {vault.integrity ? (
          <div className="state-callout" role="status">
            {vault.integrity.valid
              ? t(I18nKey.VaultIntegrityValid)
              : t(I18nKey.VaultIntegrityInvalid)}
          </div>
        ) : null}
        <Button appearance="secondary" dimension="m" onClick={() => void vault.verify()}>
          {t(I18nKey.VaultOpenCheck)}
        </Button>
      </section>
      <Drawer
        backdrop
        closeOnBackdropClick
        closeOnEscapeKeyDown
        displayCloseIcon
        isOpen={Boolean(selectedEvent)}
        locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
        onClose={() => setSelectedEventId(null)}
        position="right"
      >
        <DrawerTitle>{t(I18nKey.VaultTitle)}</DrawerTitle>
        <DrawerContent>
          {selectedEvent ? (
            <div className="preview-drawer-content">
              <T font="Header/H5" as="h2">
                {t(I18nKey.VaultEventSequence, { sequence: selectedEvent.sequence })}
              </T>
              <dl className="detail-definition-list">
                <div>
                  <dt>{t(I18nKey.VaultEventHash)}</dt>
                  <dd className="vault-event-hash">{selectedEvent.eventHash}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.VaultEventSource, { row: selectedEvent.importRow ?? '—' })}</dt>
                  <dd>{selectedEvent.importJobId ?? '—'}</dd>
                </div>
              </dl>
              {snapshot ? <pre className="vault-event-snapshot">{snapshot}</pre> : null}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </PageIntro>
  );
});

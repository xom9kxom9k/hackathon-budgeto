import { Button, Modal, ModalContent, ModalTitle } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';
import { VaultKeyPanel } from '@/shared/ui/VaultKeyPanel';
import type { VaultEvent } from '@/shared/services/VaultService';

const snapshotSchema = z.object({
  date: z.string().optional(),
  kind: z.enum(['income', 'expense', 'transfer']).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  note: z.string().nullable().optional(),
  accountId: z.string().optional(),
  destinationAccountId: z.string().nullable().optional(),
});

export const VaultHistoryPage = observer(function VaultHistoryPage() {
  const { t, i18n } = useTranslation();
  const vault = useStore(StoreName.Vault);
  const accounts = useStore(StoreName.Accounts);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [decryptAttempt, setDecryptAttempt] = useState(0);
  const [visibleCount, setVisibleCount] = useState(15);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const selectedEvent = vault.events.find((event) => event.id === selectedEventId) ?? null;

  useEffect(() => {
    void vault.loadEvents();
    void vault.verify();
    void accounts.load();
  }, [vault, accounts]);

  useEffect(() => {
    let active = true;
    setSnapshot(null);
    setCopyState('idle');
    if (!selectedEvent || vault.status !== 'unlocked') {
      setSnapshotStatus('idle');
      return;
    }
    setSnapshotStatus('loading');
    void vault
      .decryptEvent(selectedEvent)
      .then((value) => {
        snapshotSchema.parse(JSON.parse(value));
        if (active) {
          setSnapshot(value);
          setSnapshotStatus('success');
        }
      })
      .catch(() => {
        if (active) setSnapshotStatus('error');
      });
    return () => {
      active = false;
    };
  }, [vault, vault.status, selectedEvent, decryptAttempt]);

  const source = (event: VaultEvent) =>
    event.importJobId
      ? event.importRow == null
        ? t(I18nKey.VaultImportedSource)
        : t(I18nKey.VaultEventSource, { row: event.importRow })
      : t(I18nKey.VaultManualSource);
  const action = (event: VaultEvent) =>
    t(
      event.eventType === 'transaction_confirmed'
        ? I18nKey.VaultAdded
        : event.eventType === 'transaction_updated'
          ? I18nKey.VaultUpdated
          : event.eventType === 'transaction_reversed'
            ? I18nKey.VaultReversed
            : I18nKey.VaultEventSequence,
      { sequence: event.sequence },
    );
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const payload = snapshot ? snapshotSchema.parse(JSON.parse(snapshot)) : null;
  const account = accounts.accounts.find((item) => item.id === payload?.accountId);
  const destination = accounts.accounts.find((item) => item.id === payload?.destinationAccountId);

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
      <section
        className="plain-panel journal-verification"
        aria-labelledby="journal-verification-title"
      >
        <div>
          <h2 id="journal-verification-title">{t(I18nKey.VaultIntegrityTitle)}</h2>
          <p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p>
          <p
            role={
              vault.verificationStatus === 'error' || vault.integrity?.valid === false
                ? 'alert'
                : 'status'
            }
          >
            {t(
              vault.verificationStatus === 'loading'
                ? I18nKey.LoadingState
                : vault.verificationStatus === 'error'
                  ? I18nKey.VaultIntegrityUnavailable
                  : vault.integrity
                    ? vault.integrity.valid
                      ? I18nKey.VaultIntegrityValid
                      : I18nKey.VaultIntegrityInvalid
                    : I18nKey.VaultNotChecked,
            )}
          </p>
          {vault.integrity && (
            <p className="metric-note">
              {t(I18nKey.VaultCheckedCount, { count: vault.integrity.checkedEvents })}
            </p>
          )}
        </div>
        <Button
          appearance="secondary"
          dimension="m"
          disabled={vault.verificationStatus === 'loading'}
          onClick={() => void vault.verify()}
        >
          {t(I18nKey.VaultOpenCheck)}
        </Button>
      </section>
      {!selectedEvent && (
        <details className="journal-key-details">
          <summary>
            {t(I18nKey.VaultKeyTitle)} ·{' '}
            {t(
              vault.status === 'unlocked'
                ? I18nKey.VaultKeyUnlocked
                : vault.status === 'locked'
                  ? I18nKey.VaultKeyLocked
                  : vault.status === 'uninitialized'
                    ? I18nKey.SecurityVaultUninitialized
                    : vault.status === 'error'
                      ? I18nKey.SecurityLoadError
                      : I18nKey.LoadingState,
            )}
          </summary>
          <VaultKeyPanel />
        </details>
      )}
      <section className="timeline-panel journal-list" aria-labelledby="journal-entries-title">
        <h2 id="journal-entries-title">{t(I18nKey.VaultLatest)}</h2>
        {vault.eventsStatus === 'loading' ? (
          <p role="status">{t(I18nKey.LoadingState)}</p>
        ) : vault.eventsStatus === 'error' ? (
          <div className="state-callout state-callout--error" role="alert">
            <p>{t(I18nKey.SecurityLoadError)}</p>
            <Button appearance="secondary" onClick={() => void vault.loadEvents()}>
              {t(I18nKey.TransactionsRetry)}
            </Button>
          </div>
        ) : !vault.events.length ? (
          <p>{t(I18nKey.EmptyState)}</p>
        ) : (
          vault.events.slice(0, visibleCount).map((event) => (
            <article className="journal-entry" key={event.id}>
              <div>
                <strong>{action(event)}</strong>
                <p className="metric-note">
                  {t(I18nKey.VaultEventSequence, { sequence: event.sequence })} ·{' '}
                  {date(event.createdAt)}
                </p>
                <p className="panel-copy">{source(event)}</p>
              </div>
              <Button
                appearance="tertiary"
                dimension="s"
                onClick={() => setSelectedEventId(event.id)}
              >
                {t(I18nKey.OpenDetails)}
              </Button>
            </article>
          ))
        )}
        {vault.eventsStatus === 'success' && visibleCount < vault.events.length && (
          <Button
            appearance="secondary"
            dimension="m"
            onClick={() => setVisibleCount((value) => value + 15)}
          >
            {t(I18nKey.VaultShowMore)}
          </Button>
        )}
      </section>
      {selectedEvent && (
        <Modal
          role="dialog"
          aria-modal="true"
          dimension="l"
          className="transaction-modal"
          aria-labelledby="journal-entry-title"
          closeOnEscapeKeyDown
          displayCloseIcon
          locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
          onClose={() => setSelectedEventId(null)}
        >
          <ModalTitle id="journal-entry-title">{action(selectedEvent)}</ModalTitle>
          <ModalContent>
            <div className="journal-entry-details">
              <p>
                {t(I18nKey.VaultEventSequence, { sequence: selectedEvent.sequence })} ·{' '}
                {date(selectedEvent.createdAt)}
              </p>
              <p className="panel-copy">{source(selectedEvent)}</p>
              {vault.status !== 'unlocked' ? (
                <>
                  <p>{t(I18nKey.VaultUnlockDetails)}</p>
                  <VaultKeyPanel />
                </>
              ) : snapshotStatus === 'loading' ? (
                <p role="status">{t(I18nKey.LoadingState)}</p>
              ) : snapshotStatus === 'error' ? (
                <div role="alert">
                  <p>{t(I18nKey.VaultDecryptError)}</p>
                  <Button
                    appearance="secondary"
                    onClick={() => setDecryptAttempt((value) => value + 1)}
                  >
                    {t(I18nKey.TransactionsRetry)}
                  </Button>
                </div>
              ) : (
                payload && (
                  <dl className="detail-definition-list">
                    {payload.date && (
                      <div>
                        <dt>{t(I18nKey.Date)}</dt>
                        <dd>
                          {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                            dateStyle: 'medium',
                            timeZone: 'UTC',
                          }).format(new Date(payload.date))}
                        </dd>
                      </div>
                    )}
                    {payload.kind && (
                      <div>
                        <dt>{t(I18nKey.Operation)}</dt>
                        <dd>
                          {t(
                            payload.kind === 'income'
                              ? I18nKey.TransactionTypeIncome
                              : payload.kind === 'expense'
                                ? I18nKey.TransactionTypeExpense
                                : I18nKey.ImportsTypeTransfer,
                          )}
                        </dd>
                      </div>
                    )}
                    {payload.amount !== undefined && (
                      <div>
                        <dt>{t(I18nKey.Amount)}</dt>
                        <dd>
                          {account
                            ? formatMoney(
                                Number(payload.amount),
                                account.currency,
                                i18n.resolvedLanguage,
                              )
                            : new Intl.NumberFormat(i18n.resolvedLanguage).format(
                                Number(payload.amount),
                              )}
                        </dd>
                      </div>
                    )}
                    {account && (
                      <div>
                        <dt>{t(I18nKey.Account)}</dt>
                        <dd>
                          {account.name}
                          {destination ? ` → ${destination.name}` : ''}
                        </dd>
                      </div>
                    )}
                    {payload.note && (
                      <div>
                        <dt>{t(I18nKey.ImportsNote)}</dt>
                        <dd>{payload.note}</dd>
                      </div>
                    )}
                  </dl>
                )
              )}
              <details className="journal-technical">
                <summary>{t(I18nKey.VaultTechnicalDetails)}</summary>
                <dl className="detail-definition-list">
                  <div>
                    <dt>{t(I18nKey.VaultEventHash)}</dt>
                    <dd className="vault-event-hash">{selectedEvent.eventHash}</dd>
                  </div>
                </dl>
                {snapshot && (
                  <pre className="vault-event-snapshot">
                    {JSON.stringify(JSON.parse(snapshot), null, 2)}
                  </pre>
                )}
                <Button
                  appearance="tertiary"
                  dimension="s"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedEvent.id);
                      setCopyState('copied');
                    } catch {
                      setCopyState('error');
                    }
                  }}
                >
                  {t(copyState === 'copied' ? I18nKey.AuthCopied : I18nKey.VaultCopyId)}
                </Button>
                {copyState === 'error' && <p role="alert">{t(I18nKey.AuthCopyFailed)}</p>}
              </details>
            </div>
          </ModalContent>
        </Modal>
      )}
    </PageIntro>
  );
});

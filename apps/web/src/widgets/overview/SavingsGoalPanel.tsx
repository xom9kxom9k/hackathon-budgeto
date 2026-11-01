import { Button } from '@admiral-ds/react-ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootStore } from '@/app/stores/StoreProvider';
import { I18nKey } from '@/shared/i18n';
import { savingsEstimate } from '@/shared/lib/analytics';
import { formatMoney } from '@/shared/lib/formatMoney';
import { SavingsService, type SavingsGoal } from '@/shared/services/SavingsService';

export function SavingsGoalPanel({
  currency,
  net,
  from,
  to,
}: {
  currency: string;
  net: number;
  from: string;
  to: string;
}) {
  const { t, i18n } = useTranslation();
  const { apiClient } = useRootStore();
  const service = useMemo(() => new SavingsService(apiClient), [apiClient]);
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('0');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [loadVersion, setLoadVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    service
      .get(currency, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setGoal(value);
        setName(value?.name ?? '');
        setTarget(value ? String(value.target) : '');
        setSaved(String(value?.saved ?? 0));
        setEditing(!value);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [currency, service, loadVersion]);
  const money = (value: number) => formatMoney(value, currency, i18n.resolvedLanguage);
  const estimate = goal ? savingsEstimate(goal.target, goal.saved, net, from, to) : null;
  async function save() {
    if (status === 'saving') return;
    setStatus('saving');
    try {
      const value = await service.save(currency, {
        name: name.trim(),
        target: Number(target),
        saved: Number(saved),
      });
      setGoal(value);
      setEditing(false);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }
  return (
    <section className="plain-panel savings-panel" aria-labelledby="savings-title">
      <div className="category-ranking-heading">
        <h2 id="savings-title">{t(I18nKey.SavingsTitle)}</h2>
        {goal && !editing && (
          <Button
            appearance="tertiary"
            dimension="s"
            onClick={() => {
              setName(goal.name);
              setTarget(String(goal.target));
              setSaved(String(goal.saved));
              setStatus('ready');
              setEditing(true);
            }}
          >
            {t(I18nKey.SavingsEdit)}
          </Button>
        )}
      </div>
      {status === 'loading' ? (
        <p role="status">{t(I18nKey.LoadingState)}</p>
      ) : (
        <>
          {status === 'error' && (
            <div className="state-callout state-callout--error" role="alert">
              <p>{t(I18nKey.SavingsError)}</p>
              {!editing && (
                <Button
                  appearance="secondary"
                  dimension="s"
                  onClick={() => setLoadVersion((value) => value + 1)}
                >
                  {t(I18nKey.TransactionsRetry)}
                </Button>
              )}
            </div>
          )}
          {editing ? (
            <form
              className="reference-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {!goal && <p className="panel-copy">{t(I18nKey.SavingsEmpty)}</p>}
              <label className="form-field">
                <span>{t(I18nKey.SavingsName)}</span>
                <input
                  required
                  maxLength={80}
                  pattern=".*[^ ].*"
                  disabled={status === 'saving'}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <div className="form-two-columns">
                <label className="form-field">
                  <span>
                    {t(I18nKey.SavingsTarget)} · {currency}
                  </span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="1000000000000"
                    step="0.01"
                    inputMode="decimal"
                    disabled={status === 'saving'}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>{t(I18nKey.SavingsSaved)}</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="0.01"
                    inputMode="decimal"
                    disabled={status === 'saving'}
                    value={saved}
                    onChange={(event) => setSaved(event.target.value)}
                  />
                </label>
              </div>
              <div className="form-actions">
                {goal && (
                  <Button
                    appearance="secondary"
                    dimension="m"
                    disabled={status === 'saving'}
                    onClick={() => {
                      setEditing(false);
                      setStatus('ready');
                    }}
                  >
                    {t(I18nKey.TransactionCancel)}
                  </Button>
                )}
                <Button type="submit" dimension="m" disabled={status === 'saving'}>
                  {t(status === 'saving' ? I18nKey.TransactionSaving : I18nKey.AccountsSave)}
                </Button>
              </div>
            </form>
          ) : (
            goal && (
              <>
                <h3 className="savings-name">{goal.name}</h3>
                <div className="savings-amount">
                  <strong>{money(goal.saved)}</strong>
                  <span> / {money(goal.target)}</span>
                </div>
                <progress
                  className="savings-progress"
                  max={goal.target}
                  value={Math.min(goal.saved, goal.target)}
                  aria-label={goal.name}
                />
                <p className="panel-copy">
                  {t(I18nKey.SavingsRemaining, {
                    amount: money(Math.max(0, goal.target - goal.saved)),
                  })}
                </p>
                <div className="savings-estimate" role="status">
                  {estimate?.status === 'ready' ? (
                    <>
                      <strong>
                        {t(I18nKey.SavingsEstimate, {
                          date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'UTC',
                          }).format(new Date(estimate.date)),
                          days: estimate.days,
                        })}
                      </strong>
                      <p className="panel-copy">
                        {t(I18nKey.SavingsAssumption, { amount: money(estimate.monthly) })}
                      </p>
                    </>
                  ) : (
                    <p className="panel-copy">
                      {t(
                        estimate?.status === 'complete'
                          ? I18nKey.SavingsComplete
                          : estimate?.status === 'deficit'
                            ? I18nKey.SavingsDeficit
                            : estimate?.status === 'distant'
                              ? I18nKey.SavingsDistant
                              : I18nKey.SavingsPeriod,
                      )}
                    </p>
                  )}
                </div>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}

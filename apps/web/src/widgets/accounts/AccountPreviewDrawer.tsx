import {
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  StatusIndicator,
  T,
} from '@admiral-ds/react-ui';
import { useTranslation } from 'react-i18next';

import type { AccountSummary, Bank, FinancialProduct } from '@/entities/account/model/types';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';

export type AccountPreviewTarget =
  { id: string; type: 'bank' } | { id: string; type: 'account' } | { id: string; type: 'product' };

interface AccountPreviewDrawerProps {
  accounts: AccountSummary[];
  banks: Bank[];
  onClose: () => void;
  onOpenFull: (target: AccountPreviewTarget) => void;
  products: FinancialProduct[];
  target: AccountPreviewTarget | null;
}

export function AccountPreviewDrawer({
  accounts,
  banks,
  onClose,
  onOpenFull,
  products,
  target,
}: AccountPreviewDrawerProps) {
  const { t } = useTranslation();
  const entity = target
    ? target.type === 'bank'
      ? banks.find((bank) => bank.id === target.id)
      : target.type === 'account'
        ? accounts.find((account) => account.id === target.id)
        : products.find((product) => product.id === target.id)
    : null;

  return (
    <Drawer
      backdrop
      closeOnBackdropClick
      closeOnEscapeKeyDown
      displayCloseIcon
      isOpen={Boolean(target)}
      locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
      onClose={onClose}
      position="right"
    >
      <DrawerTitle>{entity?.name ?? t(I18nKey.OpenDetails)}</DrawerTitle>
      <DrawerContent>
        {entity ? (
          <div className="preview-drawer-content">
            <StatusIndicator
              dimension="s"
              text={t(entity.status === 'demo' ? I18nKey.Demo : I18nKey.Connected)}
            />
            {'balance' in entity ? (
              <div className="drawer-balance">
                <span>{t(I18nKey.AccountsBalance)}</span>
                <T font="Header/H4" as="p">
                  {formatMoney(entity.balance, entity.currency)}
                </T>
              </div>
            ) : null}
            <p className="panel-copy">
              {target?.type === 'bank'
                ? t(I18nKey.BankDetailDescription)
                : target?.type === 'account'
                  ? t(I18nKey.AccountDetailKicker)
                  : t(I18nKey.ProductDetailKicker)}
            </p>
            <Button appearance="primary" dimension="m" onClick={() => target && onOpenFull(target)}>
              {t(I18nKey.AccountsOpen)}
            </Button>
          </div>
        ) : (
          <div className="state-callout">{t(I18nKey.EmptyState)}</div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

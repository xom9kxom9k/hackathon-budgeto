import { Drawer, DrawerContent, DrawerTitle } from '@admiral-ds/react-ui';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';

import { ReferenceForm, type ReferenceFormValue } from './ReferenceForm';

interface ReferenceEditorDrawerProps {
  initial?: ReferenceFormValue;
  mode: 'account' | 'category';
  onClose: () => void;
  onSubmit: (value: ReferenceFormValue) => void;
  open: boolean;
  saving: boolean;
}

export function ReferenceEditorDrawer({
  initial,
  mode,
  onClose,
  onSubmit,
  open,
  saving,
}: ReferenceEditorDrawerProps) {
  const { t } = useTranslation();
  const title = t(
    initial
      ? mode === 'account'
        ? I18nKey.AccountsEdit
        : I18nKey.CategoriesEdit
      : mode === 'account'
        ? I18nKey.AccountsAdd
        : I18nKey.CategoriesAdd,
  );

  if (!open) return null;

  return (
    <Drawer
      backdrop
      closeOnBackdropClick={!saving}
      closeOnEscapeKeyDown={!saving}
      displayCloseIcon
      isOpen={open}
      locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
      onClose={onClose}
      position="right"
    >
      <DrawerTitle>{title}</DrawerTitle>
      <DrawerContent>
        <ReferenceForm
          initial={initial}
          mode={mode}
          onCancel={onClose}
          onSubmit={onSubmit}
          saving={saving}
        />
      </DrawerContent>
    </Drawer>
  );
}

import { Modal, ModalContent, ModalTitle } from '@admiral-ds/react-ui';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';

import { ReferenceForm, type ReferenceFormValue } from './ReferenceForm';

interface ReferenceEditorModalProps {
  initial?: ReferenceFormValue;
  error?: string;
  mode: 'account' | 'category';
  onClose: () => void;
  onSubmit: (value: ReferenceFormValue) => void;
  open: boolean;
  saving: boolean;
}

export function ReferenceEditorModal({
  initial,
  error,
  mode,
  onClose,
  onSubmit,
  open,
  saving,
}: ReferenceEditorModalProps) {
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
    <Modal
      role="dialog"
      aria-modal="true"
      dimension="m"
      aria-labelledby="reference-editor-title"
      closeOnEscapeKeyDown={!saving}
      displayCloseIcon={!saving}
      locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
      onClose={saving ? undefined : onClose}
    >
      <ModalTitle id="reference-editor-title">{title}</ModalTitle>
      <ModalContent>
        <ReferenceForm
          initial={initial}
          error={error}
          mode={mode}
          onCancel={onClose}
          onSubmit={onSubmit}
          saving={saving}
        />
      </ModalContent>
    </Modal>
  );
}

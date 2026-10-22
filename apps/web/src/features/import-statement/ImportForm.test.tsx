import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';

import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { i18n } from '@/shared/i18n';

import { ImportForm, importFileSchema } from './ImportForm';

function renderForm() {
  return render(
    <StoreProvider store={new RootStore()}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={LIGHT_THEME}>
          <ImportForm />
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>,
  );
}

describe('ImportForm', () => {
  it('rejects unsupported file extensions', async () => {
    const result = importFileSchema.safeParse({
      file: new File(['data'], 'statement.pdf', { type: 'application/pdf' }),
    });

    expect(result.success).toBe(false);
  });

  it('shows the file check result for a valid CSV', async () => {
    const user = userEvent.setup();
    renderForm();
    const input = document.querySelector('input[type="file"]');

    await user.upload(
      input as HTMLInputElement,
      new File(['date,amount'], 'statement.csv', { type: 'text/csv' }),
    );
    await user.click(screen.getByRole('button', { name: 'Проверить файл' }));

    expect(await screen.findByText('Файл проверен')).toBeInTheDocument();
  });
});

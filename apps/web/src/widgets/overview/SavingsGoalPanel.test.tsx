import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { i18n, Language } from '@/shared/i18n';
import { SavingsService } from '@/shared/services/SavingsService';
import { SavingsGoalPanel } from './SavingsGoalPanel';

afterEach(() => vi.restoreAllMocks());
it('keeps the goal draft on an API error and saves it on retry', async () => {
  await i18n.changeLanguage(Language.Ru);
  vi.spyOn(SavingsService.prototype, 'get').mockResolvedValue(null);
  const save = vi
    .spyOn(SavingsService.prototype, 'save')
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ name: 'Отпуск', target: 100000, saved: 12000, currency: 'RUB' });
  render(
    <StoreProvider store={new RootStore()}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={LIGHT_THEME}>
          <SavingsGoalPanel currency="RUB" net={20000} from="2026-10-01" to="2026-10-31" />
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>,
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('На что копите'), 'Отпуск');
  await user.type(screen.getByLabelText('Нужно накопить · RUB'), '100000');
  await user.clear(screen.getByLabelText('Уже отложено (вручную)'));
  await user.type(screen.getByLabelText('Уже отложено (вручную)'), '12000');
  await user.click(screen.getByRole('button', { name: 'Сохранить' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByLabelText('На что копите')).toHaveValue('Отпуск');
  expect(screen.getByLabelText('Нужно накопить · RUB')).toHaveValue(100000);
  await user.click(screen.getByRole('button', { name: 'Сохранить' }));
  expect(await screen.findByRole('heading', { name: 'Отпуск' })).toBeInTheDocument();
  expect(save).toHaveBeenLastCalledWith('RUB', { name: 'Отпуск', target: 100000, saved: 12000 });
});

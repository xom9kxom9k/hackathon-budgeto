import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviderTree } from './app/providers/AppProviders';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviderTree />
  </StrictMode>,
);

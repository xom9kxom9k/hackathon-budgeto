import { act, renderHook } from '@testing-library/react';

import { useIsCompactLayout } from './useMediaQuery';

describe('useIsCompactLayout', () => {
  let matches = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  beforeEach(() => {
    matches = false;
    listeners.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches,
        media: query,
        onchange: null,
        removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
        removeListener: () => undefined,
      }),
    });
  });

  it('tracks compact layout changes', () => {
    const { result } = renderHook(() => useIsCompactLayout());

    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(result.current).toBe(true);
  });
});

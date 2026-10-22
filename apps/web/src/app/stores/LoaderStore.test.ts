import { LoaderStore } from './LoaderStore';

describe('LoaderStore', () => {
  it('keeps the global loading state while any request is active', () => {
    const store = new LoaderStore();

    store.start('request-a');
    store.start('request-b');
    expect(store.isLoading).toBe(true);
    expect(store.activeRequestCount).toBe(2);

    store.finish('request-a');
    expect(store.isLoading).toBe(true);
    expect(store.activeRequestCount).toBe(1);

    store.finish('request-b');
    expect(store.isLoading).toBe(false);
    expect(store.activeRequestCount).toBe(0);
  });

  it('is safe when a request finishes more than once', () => {
    const store = new LoaderStore();

    store.start('request-a');
    store.finish('request-a');
    store.finish('request-a');

    expect(store.activeRequestCount).toBe(0);
  });
});

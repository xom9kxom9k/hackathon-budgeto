import '@testing-library/jest-dom/vitest';

if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => `test-${Math.random().toString(16).slice(2)}`,
  });
}

if (!globalThis.IntersectionObserver) {
  class TestIntersectionObserver {
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: TestIntersectionObserver,
  });
}

if (!globalThis.DataTransfer) {
  class TestDataTransfer {
    private readonly fileList: File[] = [];
    readonly items = {
      add: (file: File) => {
        this.fileList.push(file);
      },
    };

    get files(): FileList {
      return this.fileList as unknown as FileList;
    }
  }

  Object.defineProperty(globalThis, 'DataTransfer', {
    configurable: true,
    value: TestDataTransfer,
  });
}

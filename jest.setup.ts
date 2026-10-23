// Global setup for component tests (jest-expo preset).
import '@testing-library/react-native/matchers';

// Expo installs some web globals lazily; resolve them once while module loading is allowed
// (known jest-expo issue with ImportMetaRegistry and structuredClone).
jest.mock('expo/build/winter/ImportMetaRegistry', () => ({ ImportMetaRegistry: { get url() { return null; } } }));
for (const name of ['TextDecoderStream', 'TextEncoderStream', 'URL', 'URLSearchParams', 'DOMException', '__ExpoImportMetaRegistry', 'structuredClone', 'fetch']) {
  void (globalThis as Record<string, unknown>)[name];
}

// Device storage: in-memory stand-in for expo-sqlite/kv-store.
jest.mock('expo-sqlite/kv-store', () => {
  const m = new Map<string, string>();
  const store = {
    getItemSync: (k: string) => m.get(k) ?? null,
    setItemSync: (k: string, v: string) => void m.set(k, v),
    removeItemSync: (k: string) => m.delete(k),
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => void m.set(k, v),
    removeItem: async (k: string) => void m.delete(k),
  };
  return { __esModule: true, default: store, Storage: store };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useFocusEffect: () => undefined,
  Link: ({ children }: { children: unknown }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
}));

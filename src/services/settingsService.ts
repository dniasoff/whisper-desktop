import Store from 'electron-store';

interface Settings {
  shortcut: string;
  apiUrl: string;
  apiToken: string;
}

const store = new Store({
  defaults: {
    shortcut: 'Ctrl+Q',
    apiUrl: 'http://127.0.0.1:4444',
    apiToken: '',
  },
}) as Store<Settings>;

export function getSettings(): Settings {
  const storeAny = store as any;
  return {
    shortcut: storeAny.get('shortcut', 'Ctrl+Q'),
    apiUrl: storeAny.get('apiUrl', 'http://127.0.0.1:4444'),
    apiToken: storeAny.get('apiToken', ''),
  };
}

export function saveSetting(key: keyof Settings, value: string): void {
  const storeAny = store as any;
  storeAny.set(key, value);
}

export function saveSettings(settings: Partial<Settings>): void {
  const storeAny = store as any;
  Object.entries(settings).forEach(([key, value]) => {
    storeAny.set(key as keyof Settings, value);
  });
}

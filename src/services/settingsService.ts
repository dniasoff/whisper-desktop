import Store from 'electron-store';

interface Settings {
  shortcut: string;
  apiUrl: string;
  apiToken: string;
  autoMuteAudio: boolean;
  micDevice: string;
}

const store = new Store({
  name: 'config',
  defaults: {
    shortcut: 'Ctrl+Q',
    apiUrl: 'http://127.0.0.1:4444',
    apiToken: '',
    autoMuteAudio: true,
    micDevice: 'default',
  },
}) as Store<Settings>;

export function getSettings(): Settings {
  const storeAny = store as any;
  return {
    shortcut: storeAny.get('shortcut', 'Ctrl+Q'),
    apiUrl: storeAny.get('apiUrl', 'http://127.0.0.1:4444'),
    apiToken: storeAny.get('apiToken', ''),
    autoMuteAudio: storeAny.get('autoMuteAudio', true),
    micDevice: storeAny.get('micDevice', 'default'),
  };
}

export function saveSetting(key: keyof Settings, value: Settings[keyof Settings]): void {
  const storeAny = store as any;
  storeAny.set(key, value);
}

export function saveSettings(settings: Partial<Settings>): void {
  const storeAny = store as any;
  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined) {
      storeAny.set(key as keyof Settings, value);
    }
  });
}

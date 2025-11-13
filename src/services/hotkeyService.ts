import { globalShortcut } from 'electron';

export default function registerShortcuts(callback: () => void, shortcut: string = 'Ctrl+Q'): void {
  try {
    const ret = globalShortcut.register(shortcut, () => {
      callback();
    });

    if (!ret) {
      console.error(`Failed to register shortcut: ${shortcut}`);
    }
  } catch (error) {
    console.error('Error registering shortcuts:', error);
  }
}

/**
 * Unregister all shortcuts on app quit
 */
export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}

import { app, BrowserWindow, Menu, Tray, ipcMain, Notification } from 'electron';
import path from 'path';
import * as fs from 'fs';
import registerShortcuts from './services/hotkeyService';
import { recordAudio, stopRecording, cleanupOldRecordings, getAudioDevices } from './services/recordingService';
import { transcribeAudio, checkAPIHealth, setApiConfig } from './services/apiService';
import { getSettings, saveSettings } from './services/settingsService';
import { pasteTranscriptClipboard, copyToClipboard } from './services/pasteService';
import { saveAndMuteAudio, restoreAudio } from './services/audioControlService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;
let currentShortcut: string = 'Ctrl+Q';
let lastTranscription: string = '';
let transcriptionNotification: Notification | null = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app (we'll create an index.html)
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Hide instead of close on window close
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Always start in background (hidden in tray)
  // User can show window via tray menu "Show/Hide" option
};

const showSystemNotification = (title: string, body: string, autoCloseMs?: number) => {
  const notification = new Notification({
    title: title,
    body: body,
    timeoutType: 'never',
    silent: true,
  });
  notification.show();

  // Auto-close after specified time (default 2 seconds), or never if undefined
  if (autoCloseMs !== undefined) {
    setTimeout(() => {
      notification.close();
    }, autoCloseMs);
  }

  return notification;
};


const createTray = () => {
  try {
    // Load custom icon - use app.getAppPath() for correct path in packaged app
    const iconPath = path.join(app.getAppPath(), 'assets/whisper.ico');
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Icon file not found at ${iconPath}`);
    }
    tray = new Tray(iconPath);
  } catch (error) {
    console.error('Error creating tray:', error);
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const { nativeImage } = require('electron');
    const image = nativeImage.createEmpty();
    tray = new Tray(image);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
        }
      },
    },
    {
      label: 'Recording Status',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Whisper Desktop');
};

app.on('ready', () => {
  const settings = getSettings();
  currentShortcut = settings.shortcut;
  setApiConfig(settings.apiUrl, settings.apiToken);

  // Enable auto-start on Windows startup (minimized to tray)
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden'],
    });
  }

  createWindow();
  createTray();
  registerShortcuts(handleRecordingToggle, settings.shortcut);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
});

const startRecordingSession = async () => {
  const settings = getSettings();
  let audioMuted = false;

  try {
    cleanupOldRecordings(7 * 24);

    const isAPIHealthy = await checkAPIHealth();
    if (!isAPIHealthy) {
      const errorMsg = 'Whisper API is not running at http://127.0.0.1:4444. Please start the API before recording.';
      mainWindow?.webContents.send('error', { message: errorMsg });
      isRecording = false;
      return;
    }

    // Mute system audio if enabled in settings
    if (settings.autoMuteAudio) {
      try {
        await saveAndMuteAudio();
        audioMuted = true;
      } catch (error) {
        console.error('Failed to mute audio:', error);
        // Continue recording even if mute fails
      }
    }

    mainWindow?.webContents.send('recording-started');
    showSystemNotification('Whisper Desktop', 'Recording...', 2000);

    const audioPath = await recordAudio(settings.micDevice || 'default');
    mainWindow?.webContents.send('recording-stopped');

    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      const errorMsg = 'Recording produced no audio data. Please ensure your microphone is working.';
      mainWindow?.webContents.send('error', { message: errorMsg });
      return;
    }

    transcriptionNotification = showSystemNotification('Whisper Desktop', 'Transcribing...');

    const transcription = await transcribeAudio(audioPath);
    lastTranscription = transcription;

    if (transcriptionNotification) {
      transcriptionNotification.close();
      transcriptionNotification = null;
    }

    mainWindow?.webContents.send('transcription-complete', { transcription });

    await pasteTranscriptClipboard(transcription, true);

    // Delete audio file with retry (file may be briefly locked after API upload)
    const deleteWithRetry = async (path: string, retries = 3, delay = 500) => {
      for (let i = 0; i < retries; i++) {
        try {
          fs.unlinkSync(path);
          return;
        } catch (err) {
          if (i < retries - 1) {
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
    };
    deleteWithRetry(audioPath).catch(() => {
      // Silently fail - cleanup service will handle old files
    });
  } catch (error) {
    console.error('Recording/transcription error:', error);

    // Close transcription notification on error
    if (transcriptionNotification) {
      transcriptionNotification.close();
      transcriptionNotification = null;
    }

    let errorMessage = 'Failed to record or transcribe';
    const errorStr = String(error);

    if (errorStr.includes('ECONNREFUSED') || errorStr.includes('ENOTFOUND')) {
      errorMessage = 'Cannot connect to Whisper API. Make sure it\'s running on http://127.0.0.1:4444';
    } else if (errorStr.includes('ENOENT') || errorStr.includes('not found')) {
      errorMessage = 'Audio file was not created. Check microphone connection.';
    } else if (errorStr.includes('Invalid response')) {
      errorMessage = 'API returned an unexpected response. Check your Whisper API version.';
    } else if (errorStr.includes('timeout')) {
      errorMessage = 'Request timed out. The API might be overloaded or unresponsive.';
    } else {
      errorMessage = `Error: ${errorStr.split('\n')[0].substring(0, 100)}`;
    }

    mainWindow?.webContents.send('error', { message: errorMessage });
  } finally {
    // Restore audio if it was muted
    if (audioMuted) {
      try {
        await restoreAudio();
      } catch (error) {
        console.error('Failed to restore audio:', error);
      }
    }
    isRecording = false;
  }
};

const handleRecordingToggle = async () => {
  if (isRecording) {
    await stopRecording();
  } else {
    isRecording = true;
    void startRecordingSession();
  }
};

ipcMain.handle('get-status', () => {
  return { isRecording };
});

ipcMain.handle('start-recording', async () => {
  if (isRecording) {
    mainWindow?.webContents.send('error', { message: 'Recording already in progress.' });
    return;
  }

  isRecording = true;
  void startRecordingSession();
});

ipcMain.handle('stop-recording', async () => {
  if (!isRecording) {
    return;
  }

  await stopRecording();
});

ipcMain.handle('get-settings', () => {
  return getSettings();
});

ipcMain.handle('save-settings', (_event, settings: any) => {
  saveSettings(settings);

  if (settings.apiUrl || settings.apiToken) {
    const current = getSettings();
    setApiConfig(current.apiUrl, current.apiToken);
  }

  if (settings.shortcut) {
    currentShortcut = settings.shortcut;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const { globalShortcut } = require('electron');
    globalShortcut.unregisterAll();
    registerShortcuts(handleRecordingToggle, settings.shortcut);
  }

  return { success: true };
});

ipcMain.handle('copy-to-clipboard', () => {
  if (lastTranscription) {
    copyToClipboard(lastTranscription);
    return { success: true };
  }
  return { success: false, message: 'No transcription to copy' };
});

ipcMain.handle('get-audio-devices', async () => {
  return await getAudioDevices();
});

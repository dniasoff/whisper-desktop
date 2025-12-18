import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onTranscriptionComplete: (callback: (data: { transcription: string }) => void) => {
    ipcRenderer.on('transcription-complete', (event, data) => {
      callback(data);
    });
  },
  onError: (callback: (data: { message: string }) => void) => {
    ipcRenderer.on('error', (event, data) => {
      callback(data);
    });
  },
  onRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('recording-started', () => {
      callback();
    });
  },
  onRecordingStopped: (callback: () => void) => {
    ipcRenderer.on('recording-stopped', () => {
      callback();
    });
  },
  getStatus: (callback: (data: { isRecording: boolean }) => void) => {
    ipcRenderer.invoke('get-status').then(callback);
  },
  startRecording: () => {
    return ipcRenderer.invoke('start-recording');
  },
  stopRecording: () => {
    return ipcRenderer.invoke('stop-recording');
  },
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },
  saveSettings: (settings: any) => {
    return ipcRenderer.invoke('save-settings', settings);
  },
  copyToClipboard: () => {
    return ipcRenderer.invoke('copy-to-clipboard');
  },
  getAudioDevices: () => {
    return ipcRenderer.invoke('get-audio-devices');
  },
});

declare global {
  interface Window {
    api: {
      onTranscriptionComplete: (callback: (data: { transcription: string }) => void) => void;
      onError: (callback: (data: { message: string }) => void) => void;
      onRecordingStarted: (callback: () => void) => void;
      onRecordingStopped: (callback: () => void) => void;
      getStatus: (callback: (data: { isRecording: boolean }) => void) => void;
      startRecording: () => Promise<void>;
      stopRecording: () => Promise<void>;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<any>;
      copyToClipboard: () => Promise<{ success: boolean; message?: string }>;
      getAudioDevices: () => Promise<Array<{ id: string; name: string }>>;
    };
  }
}

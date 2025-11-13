# Development Guide

## Architecture

### Main Process (main.ts)
- Handles Electron window lifecycle
- Manages system tray icon
- Registers F9 hotkey
- Handles IPC events from renderer
- Coordinates audio recording and API calls

### Renderer Process (index.html)
- Displays UI with recording status
- Shows transcription results
- Communicates with main process via IPC
- Updates UI in real-time

### Services Layer
- **hotkeyService.ts**: Manages global F9 hotkey via Electron's globalShortcut API
- **audioService.ts**: Records audio using node-record-lpcm16, saves to userData/recordings
- **apiService.ts**: Makes HTTP requests to Whisper API with axios

### Security (preload.ts)
- Implements context isolation between main and renderer
- Exposes only necessary APIs via contextBridge
- IPC communication is type-safe

## Recording Flow

```
F9 Pressed
    ↓
hotkeyService triggers callback
    ↓
main.ts: handleRecordingToggle()
    ↓
audioService.recordAudio()
    ├─ Creates WriteStream to audio file
    ├─ Starts recording via node-record-lpcm16
    ├─ Waits for silence (5s) or timeout (60s)
    └─ Returns audio file path
    ↓
apiService.transcribeAudio(audioPath)
    ├─ Reads audio file
    ├─ Creates FormData with file
    ├─ POSTs to /v1/audio/transcriptions
    └─ Returns transcription text
    ↓
IPC: ipcMain.send('transcription-complete')
    ↓
Renderer: Updates UI with result
```

## Key Implementation Details

### Audio Recording
- Uses `node-record-lpcm16` which wraps `rec` or `sox` command-line tools
- Sample rate: 16000 Hz (standard for speech recognition)
- Stores files in: `%APPDATA%/whisper-desktop/recordings/`
- Silence detection: 5 seconds of no audio triggers stop

### API Communication
- Base URL: `http://127.0.0.1:4444`
- Uses multipart/form-data for audio upload
- Timeouts: 30 seconds per request
- Error handling returns message to renderer

### IPC Communication
- Preload script exposes safe API via contextBridge
- Main process responds with `ipcMain.on()` listeners
- Renderer listens for events via `window.api` interface

## Adding New Features

### Example: Add Recording Time Limit UI

1. **Modify main.ts** - Add timer logic:
```typescript
let recordingStartTime: number | null = null;
let recordingTimer: NodeJS.Timeout | null = null;

const handleRecordingToggle = async () => {
  if (isRecording) {
    // Stop recording
    recordingStartTime = null;
    if (recordingTimer) clearInterval(recordingTimer);
  } else {
    // Start recording
    isRecording = true;
    recordingStartTime = Date.now();
    recordingTimer = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime!;
      mainWindow?.webContents.send('recording-time', { elapsed });
    }, 100);
  }
};
```

2. **Update preload.ts** - Add new event listener:
```typescript
onRecordingTime: (callback: (data: { elapsed: number }) => void) => {
  ipcRenderer.on('recording-time', (event, data) => {
    callback(data);
  });
},
```

3. **Update UI (index.html)** - Add timer display:
```html
<div id="recordingTimer" style="display: none;">
  Recording: <span id="timerValue">0.0</span>s
</div>
```

```javascript
window.api.onRecordingTime(({ elapsed }) => {
  const seconds = (elapsed / 1000).toFixed(1);
  document.getElementById('timerValue').textContent = seconds;
});
```

## Known Limitations & Solutions

### 1. Windows Audio Recording
**Issue**: node-record-lpcm16 requires `rec` or `sox` to be installed
**Solution**: Install SoX from http://sox.sourceforge.net or via Chocolatey:
```bash
choco install sox
```

### 2. F9 Hotkey Conflicts
**Issue**: F9 might be bound to another application
**Solution**:
- Check: Settings → Accessibility → Keyboard
- Disable conflicting apps
- Consider alternative hotkey: Change 'F9' to 'F8' etc. in hotkeyService.ts

### 3. Microphone Permissions
**Issue**: Windows blocks audio recording
**Solution**:
- Settings → Privacy & Security → Microphone
- Ensure Whisper Desktop (electron.exe) has microphone access

### 4. API Connection Issues
**Issue**: Whisper API not reachable
**Solution**:
- Verify API is running: `curl http://127.0.0.1:4444/v1/health`
- Check firewall: Allow localhost traffic
- Verify port 4444 is not in use: `netstat -ano | findstr :4444`

### 5. Large Audio Files
**Issue**: API timeout on large recordings
**Solution**: Increase timeout in apiService.ts:
```typescript
this.client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increase to 60 seconds
});
```

## Debugging

### Enable Console Logs
In main.ts, open DevTools:
```typescript
mainWindow.webContents.openDevTools();
```

### Check Recording Files
```powershell
explorer $env:APPDATA\whisper-desktop\recordings
```

### Test API Directly
```powershell
# Health check
curl http://127.0.0.1:4444/v1/health

# Test transcription (requires actual audio file)
curl -X POST http://127.0.0.1:4444/v1/audio/transcriptions `
  -F "file=@path/to/audio.wav"
```

## Performance Optimization

### Code Splitting
Consider lazy-loading services:
```typescript
const { recordAudio } = await import('./services/audioService');
```

### Memory Management
Clean up old recordings:
```typescript
import { cleanupOldRecordings } from './services/audioService';
app.on('ready', () => {
  cleanupOldRecordings(24); // Delete recordings older than 24 hours
});
```

### Electron Optimization
- Don't load DevTools in production
- Use V8 code caching
- Preload only necessary modules

## Testing Checklist

- [ ] F9 hotkey triggers recording
- [ ] Recording stops after 5 seconds silence
- [ ] Recording stops after 60 seconds max
- [ ] Audio file is created in userData/recordings
- [ ] API receives audio file
- [ ] Transcription is returned and displayed
- [ ] UI updates with real-time status
- [ ] Error messages display properly
- [ ] App minimizes/restores via tray icon
- [ ] No console errors

## Deployment

### Build for Distribution
```bash
npm run build
electron-builder
```

(Note: electron-builder needs to be added to devDependencies)

### Code Signing (Windows)
For production releases, sign the executable to avoid SmartScreen warnings.

## Future Enhancements

1. **Clipboard Integration** - Auto-paste transcription
2. **Settings UI** - Configure hotkey, API URL, silence timeout
3. **Transcription History** - Store and display past transcriptions
4. **Multiple Languages** - Support for different languages
5. **Batch Processing** - Transcribe multiple audio files
6. **Dark Mode** - Theme support
7. **System Tray Context Menu** - Quick settings access
8. **Auto-update** - electron-updater integration


# Quick Start Guide - Whisper Desktop

## Setup (One-time)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

## Running the App

### Option 1: Simple Start
```bash
npm start
```

### Option 2: Development Mode (with file watching)
```bash
npm run dev
```
This will automatically rebuild when you change TypeScript files.

### Option 3: Manual Watch + Dev
In one terminal:
```bash
npm run watch
```

In another terminal:
```bash
npm start
```

## First Run Checklist

- ✅ Whisper API running on http://127.0.0.1:4444
- ✅ Microphone is working and permitted in Windows
- ✅ F9 key is not bound to another app
- ✅ App appears in system tray
- ✅ Check Windows Sound settings if no audio captured

## Testing

1. Start the app
2. Ensure the tray icon appears
3. Press **F9** to start recording
4. Speak clearly: "Hello, this is a test"
5. Wait for 5 seconds of silence
6. Check the app window for transcription

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch files and auto-compile |
| `npm start` | Build and launch the app |
| `npm run dev` | Development mode with hot reload |

## File Locations

- **Source Code**: `src/`
- **Compiled Code**: `dist/` (auto-generated)
- **Recordings**: `%APPDATA%/whisper-desktop/recordings/`

## Next Steps

After getting the basic app running, you may want to:

1. Add configuration UI for settings
2. Implement clipboard paste of transcription
3. Add application history/logs
4. Create Windows installer
5. Add API timeout handling
6. Implement error recovery

## Troubleshooting

**App won't start?**
- Run `npm install` again
- Run `npm run build`
- Check Node.js version (need 18+)

**F9 not working?**
- Close other apps using F9
- Check console for hotkey registration errors
- Restart the app

**No audio recorded?**
- Check Windows microphone settings
- Test microphone with another app
- Verify recorder program is installed (`rec` or `sox`)

**API connection fails?**
- Verify Whisper API is running on port 4444
- Test: `curl http://127.0.0.1:4444/v1/health`
- Check firewall settings


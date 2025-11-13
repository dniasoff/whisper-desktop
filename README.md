# Whisper Desktop

A lightweight Windows desktop application that lets you record audio and transcribe it to text using OpenAI's Whisper API (cloud or self-hosted) with a single keyboard shortcut. The transcribed text is automatically pasted into the active application.

## Features

- **Global Hotkey Recording** - Press `Ctrl+Q` (customizable) from any application to start recording
- **Automatic Transcription** - Records audio and sends it to Whisper API (OpenAI hosted or self-hosted) for transcription
- **Auto-Paste** - Transcribed text is automatically copied to clipboard and pasted into the active window
- **Clipboard Preservation** - Original clipboard contents are restored after pasting
- **System Tray Integration** - Minimizes to system tray with real-time recording status indicator
- **Configurable Settings** - Customize keyboard shortcut, API endpoint, and API token
- **Auto-Start on Login** - Launches minimized at Windows startup
- **Real-time Status** - Visual recording indicator and status display
- **Error Notifications** - System notifications for recording events and errors
- **Auto Cleanup** - Automatically deletes recordings older than 7 days

## System Requirements

- **Operating System:** Windows 10 or later
- **Runtime:** Node.js 18+ (for development only)
- **Microphone:** Working microphone with Windows permissions enabled
- **Audio Tools:** SoX (sox) - Audio processing library
- **Whisper API:** Either a local API server OR OpenAI API key

### Installing Audio Tools

SoX is required for audio recording. Install it using Chocolatey:

```bash
choco install sox
```

Or download from: https://sourceforge.net/projects/sox/

### Setting Up Whisper API

You have two options for the Whisper API:

#### Option 1: OpenAI Hosted Service (Recommended for Most Users)

Use OpenAI's cloud-hosted Whisper API - no local server required!

**Setup:**
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open Whisper Desktop Settings (gear icon)
3. Configure:
   - **API Endpoint:** `https://api.openai.com/v1`
   - **API Token:** Your OpenAI API key (starts with `sk-`)
4. Start recording!

**Pros:**
- No local server setup required
- Always up-to-date with latest models
- Handles all compute requirements
- Works from anywhere

**Cons:**
- Requires internet connection
- Usage-based pricing (see [OpenAI Pricing](https://openai.com/api/pricing/))
- Audio sent to OpenAI servers

#### Option 2: Local API Server (For Privacy & Offline Use)

Run your own local Whisper API server on Windows using [whisper-api](https://github.com/dniasoff/whisper-api/):

**Setup:**
1. Download the latest installer from [whisper-api releases](https://github.com/dniasoff/whisper-api/releases)

2. Run the installer and follow the setup wizard

3. Start the API server (runs on `http://127.0.0.1:4444` by default)

4. Whisper Desktop will automatically connect to the local API (no configuration needed)

**Pros:**
- Complete privacy - audio stays on your machine
- Works offline
- No usage costs after setup
- Optimized for Windows

**Cons:**
- Requires local setup and maintenance
- Needs adequate hardware (GPU recommended)
- You manage updates

**Other Options:**
- Any OpenAI-compatible Whisper API server
- Self-hosted cloud instances

## Installation

### For End Users

1. **Choose your Whisper API** (see options above):
   - **OpenAI Hosted:** Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Local Server:** Install and run [whisper-api](https://github.com/dniasoff/whisper-api/)
2. Download the latest installer: `Whisper Desktop.exe`
3. Run the installer and follow the setup wizard
4. The application will appear in your system tray after installation
5. Configure API settings in the app (if using OpenAI hosted service)

### For Developers

1. Clone the repository:
```bash
git clone https://github.com/dniasoff/whisper-desktop.git
cd whisper-desktop
```

2. Install dependencies:
```bash
npm install
```

3. Start in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm run build:windows
```

## Usage

### Basic Operation

1. The application runs in your system tray (bottom right corner)
2. Press **`Ctrl+Q`** (or your configured shortcut) anywhere
3. Speak clearly into your microphone
4. Recording stops automatically after:
   - 5 seconds of silence, OR
   - 60 seconds maximum
5. Transcribed text appears in the app and is automatically pasted to the active application

### Configuring Settings

1. Click on the Whisper Desktop icon in the system tray
2. Click "Settings" (gear icon) in the application window
3. Configure the following options:
   - **Keyboard Shortcut** - Change the hotkey (e.g., `Alt+R`, `F9`, etc.)
   - **API Endpoint** - URL where Whisper API is running (default: `http://127.0.0.1:4444`)
   - **API Token** - Authentication token if required by your API

4. Settings are saved automatically

### System Tray Menu

Right-click the Whisper Desktop icon in the system tray to:
- **Show/Hide** - Toggle the application window
- **Recording Status** - View current recording status
- **Exit** - Close the application

## How It Works

### Recording Flow

```
User presses Ctrl+Q
        ↓
Audio recording starts
        ↓
Silence detected (5s) or timeout (60s)
        ↓
Audio file sent to Whisper API
        ↓
Transcribed text received
        ↓
Text automatically pasted to active window
        ↓
Recording cleaned up
```

### Technical Details

- **Sample Rate:** 16000 Hz (optimized for speech recognition)
- **Audio Format:** WAV/LPCM16 (PCM 16-bit mono)
- **Silence Detection:** 5 seconds of silence triggers transcription
- **Maximum Recording:** 60 seconds per recording
- **API Timeout:** 30 seconds for transcription request
- **Storage Location:** `%APPDATA%\whisper-desktop\recordings\`
- **Settings Storage:** Local JSON in AppData (electron-store)

## Configuration

Settings are stored in `%APPDATA%\whisper-desktop\` directory. You can also manually edit the configuration by accessing:

```
C:\Users\[YourUsername]\AppData\Roaming\whisper-desktop\
```

### Required API Endpoints

The application communicates with the following Whisper API endpoints:

```
GET  /v1/health                      - Health check before recording
POST /v1/audio/transcriptions        - Transcribe audio file
```

### Example API Request

```bash
curl -X POST http://127.0.0.1:4444/v1/audio/transcriptions \
  -F "file=@recording.wav" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Hotkey Not Working

- **Problem:** Keyboard shortcut doesn't trigger recording
- **Solution:**
  - Check for keyboard shortcut conflicts with other applications
  - Verify the shortcut is set correctly in Settings
  - Restart the application
  - Ensure Windows allows the application permission to use global hotkeys

### No Audio Recorded

- **Problem:** Recording produces no audio or empty file
- **Solution:**
  - Verify microphone is connected and enabled
  - Check Windows Sound settings (Settings → Sound)
  - Test microphone in Windows Sound Recorder
  - Ensure SoX is installed: `sox --version`
  - Restart the application

### API Connection Fails

- **Problem:** Error connecting to Whisper API
- **Solution:**

  **If using OpenAI Hosted Service:**
  - Verify your API key is correct in Settings
  - Check that API endpoint is set to `https://api.openai.com/v1`
  - Ensure you have internet connectivity
  - Verify your OpenAI account has credits/active subscription
  - Test API key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"`

  **If using Local API Server:**
  - Ensure you have a local API server running (see [whisper-api](https://github.com/dniasoff/whisper-api/))
  - Verify API is running: `curl http://127.0.0.1:4444/v1/health`
  - Check API endpoint URL in Settings (default: `http://127.0.0.1:4444`)
  - Ensure no firewall is blocking port 4444
  - Check application logs (see Development below)

### Text Not Pasting

- **Problem:** Transcribed text doesn't appear in active window
- **Solution:**
  - Click on the target application window to give it focus
  - Ensure application supports text input
  - Try pasting manually (Ctrl+V) to verify clipboard works
  - Some applications may have restrictions on automated pasting
  - Restart the application

### Microphone Permission Issues

- **Problem:** Windows says app doesn't have microphone access
- **Solution:**
  - Go to Settings → Privacy & Security → Microphone
  - Ensure Whisper Desktop is enabled
  - You may need to add the installed application path to the microphone access list

## Development

### Available Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch and auto-compile TypeScript |
| `npm start` | Build and launch the application |
| `npm run dev` | Development mode with hot reload |
| `npm run lint` | Check code style with ESLint |
| `npm run lint:fix` | Fix linting issues automatically |
| `npm test` | Run Jest unit tests |
| `npm test:watch` | Run tests in watch mode |
| `npm test:coverage` | Generate code coverage report |
| `npm run build:windows` | Build Windows NSIS installer |

### Project Structure

```
whisper-desktop/
├── src/
│   ├── main.ts                    # Electron main process
│   ├── preload.ts                 # Secure IPC bridge
│   ├── services/
│   │   ├── hotkeyService.ts       # Global keyboard shortcut handling
│   │   ├── audioService.ts        # Audio recording and processing
│   │   ├── apiService.ts          # Whisper API integration
│   │   └── settingsService.ts     # Settings persistence
│   └── __tests__/                 # Unit tests
├── public/
│   └── index.html                 # UI (settings and status display)
├── assets/
│   └── whisper.ico                # Application icon
├── dist/                          # Compiled JavaScript (generated)
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

### Technology Stack

- **Framework:** Electron 39.1.2
- **Language:** TypeScript 5.9.3
- **HTTP Client:** Axios 1.13.2
- **Audio Recording:** node-record-lpcm16 1.0.1
- **Settings Storage:** electron-store 11.0.2
- **Build Tool:** electron-builder 26.0.12
- **Testing:** Jest 30.2.0
- **Code Quality:** ESLint with TypeScript support

### Security

The application implements several security measures:

- **Context Isolation** - Renderer process cannot directly access Node.js APIs
- **Preload Bridge** - Only whitelisted IPC commands are exposed to renderer
- **No nodeIntegration** - Node.js APIs not available in renderer process
- **IPC Type Safety** - Defined interfaces for all inter-process communication
- **Restricted File Access** - File system access limited to userData directory

### Building the Installer

To create a Windows installer:

```bash
npm run build:windows
```

The installer will be created in the `dist/` directory as `Whisper Desktop.exe`.

**Note:** Building requires Windows and administrative privileges for the NSIS installer creation.

### Development Debugging

To view debug output and logs:

1. Open DevTools: Press `Ctrl+Shift+I` in the app window
2. Check the Console tab for application logs
3. Monitor the Network tab to see API calls

## Performance Considerations

- **Memory Usage:** Typical usage is 80-150MB (primarily Electron overhead)
- **CPU:** Minimal CPU usage except during recording/transcription
- **Storage:** Recordings are temporary and auto-deleted after 7 days
- **Disk I/O:** Minimal - only during recording and transcription

## Limitations

- **Windows Only:** Currently supports Windows 10 and later only
- **Single API:** Works with a single Whisper API endpoint at a time
- **Manual Text Injection:** Uses system clipboard and Ctrl+V for pasting (some applications may not support this)
- **Audio Quality:** Dependent on microphone and system audio capture
- **Internet Required:** When using OpenAI's hosted service (not required for local API)

## Future Enhancements

Potential features for future releases:

- [ ] Multi-language support in UI
- [ ] Dark mode theme
- [ ] Recording history and replay
- [ ] Custom hotkey profiles
- [ ] Cloud storage for recordings
- [ ] Batch transcription
- [ ] macOS and Linux support
- [ ] Voice activity detection improvements
- [ ] GPU acceleration for transcription
- [ ] Integration with cloud-hosted APIs

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows ESLint rules (`npm run lint:fix`)
- Tests pass (`npm test`)
- TypeScript has no errors (`npm run build`)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**MIT License Summary:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ⚠️ License and copyright notice required
- ❌ Liability
- ❌ Warranty

## Support

For issues, feature requests, or questions:

1. **GitHub Issues:** https://github.com/dniasoff/whisper-desktop/issues
2. **Email:** support@whisperdesktop.dev

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Speech recognition powered by [OpenAI's Whisper](https://github.com/openai/whisper)
- Audio processing with [SoX](http://sox.sourceforge.net/)
- Recommended local API: [whisper-api](https://github.com/dniasoff/whisper-api/)

## Changelog

### Version 1.0.0 (Latest)

- Initial release
- Global hotkey recording with customizable shortcut
- Automatic transcription with Whisper API
- Auto-paste to active window
- System tray integration
- Configurable settings (hotkey, API endpoint, token)
- Auto-start on Windows login
- Real-time recording status display
- Automatic recording cleanup

---

**Made with ❤️ for faster note-taking and transcription**


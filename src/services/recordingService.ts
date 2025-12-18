import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { promisify } from 'util';

const execAsync = promisify(exec);

let recordingProcess: ReturnType<typeof spawn> | null = null;

/**
 * Get the path to sox.exe in the unpacked directory
 */
function getSoxPath(): string {
  const appPath = app.getAppPath();
  // appPath is like: C:\...\resources\app.asar
  // We need to go to: C:\...\resources\app.asar.unpacked\...
  const resourcesDir = path.dirname(appPath);
  return path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', 'node-mic', 'sox-win32', 'sox.exe');
}

/**
 * Get list of available audio input devices
 */
export async function getAudioDevices(): Promise<Array<{ id: string; name: string }>> {
  try {
    const soxPath = getSoxPath();

    if (!fs.existsSync(soxPath)) {
      console.error('sox.exe not found');
      return [{ id: 'default', name: 'System Default Microphone' }];
    }

    // List audio devices using sox
    const { stdout, stderr } = await execAsync(`"${soxPath}" -t waveaudio -1`, {
      windowsHide: true,
      timeout: 5000
    });

    const devices: Array<{ id: string; name: string }> = [
      { id: 'default', name: 'System Default Microphone' }
    ];

    // Parse device list from stdout
    const lines = stdout.split('\n').filter(line => line.trim());

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.includes('Available') && !trimmedLine.includes('device')) {
        // Extract device name (format varies, but usually contains device info)
        devices.push({
          id: index.toString(),
          name: trimmedLine || `Device ${index}`
        });
      }
    });

    return devices;
  } catch (error) {
    console.error('Error listing audio devices:', error);
    return [{ id: 'default', name: 'System Default Microphone' }];
  }
}

/**
 * Record audio using sox directly
 * @param device - The audio input device (default: 'default')
 */
export async function recordAudio(device: string = 'default'): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const appDataPath = app.getPath('userData');
      const audioDir = path.join(appDataPath, 'recordings');

      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const timestamp = Date.now();
      const audioPath = path.join(audioDir, `recording-${timestamp}.wav`);
      const soxPath = getSoxPath();

      // Check if sox exists
      if (!fs.existsSync(soxPath)) {
        throw new Error(`sox.exe not found at ${soxPath}`);
      }

      // Start recording with sox
      // Record from specified input device to WAV file
      // On Windows, sox requires -t waveaudio and device specification
      recordingProcess = spawn(soxPath, [
        '-t', 'waveaudio',  // Windows audio driver
        device,             // input device ('default' or device number/name)
        '-r', '16000',      // sample rate
        '-c', '1',          // mono
        audioPath,          // output file
      ]);

      // Capture sox output for debugging
      let soxStderr = '';
      let soxStdout = '';

      recordingProcess.stderr?.on('data', (data) => {
        soxStderr += data.toString();
        console.error('sox stderr:', data.toString());
      });

      recordingProcess.stdout?.on('data', (data) => {
        soxStdout += data.toString();
        console.log('sox stdout:', data.toString());
      });

      recordingProcess.on('error', (error) => {
        console.error('Recording process error:', error);
        reject(error);
      });

      recordingProcess.on('exit', (code, signal) => {
        console.log(`sox exited with code ${code}, signal ${signal}`);
        console.log('sox stdout:', soxStdout);
        console.log('sox stderr:', soxStderr);

        recordingProcess = null;
        if (fs.existsSync(audioPath)) {
          resolve(audioPath);
        } else {
          reject(new Error(`Recording file was not created. Exit code: ${code}. stderr: ${soxStderr}`));
        }
      });

      // Auto-stop after 5 minutes
      setTimeout(() => {
        stopRecording().catch(reject);
      }, 300000);

    } catch (error) {
      console.error('Error starting recording:', error);
      reject(error);
    }
  });
}

/**
 * Stop the current recording
 */
export async function stopRecording(): Promise<void> {
  return new Promise((resolve) => {
    if (recordingProcess) {
      recordingProcess.stdin?.write('q'); // Send 'q' to sox to stop recording
      recordingProcess.kill('SIGTERM');
      recordingProcess = null;
    }
    setTimeout(() => resolve(), 500);
  });
}

/**
 * Clean up old recordings
 */
export function cleanupOldRecordings(maxAgeHours: number = 24): void {
  try {
    const appDataPath = app.getPath('userData');
    const audioDir = path.join(appDataPath, 'recordings');

    if (!fs.existsSync(audioDir)) {
      return;
    }

    const files = fs.readdirSync(audioDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(audioDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error('Error cleaning up recordings:', error);
  }
}

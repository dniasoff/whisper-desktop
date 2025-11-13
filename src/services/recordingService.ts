import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

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
 * Record audio using sox directly
 */
export async function recordAudio(): Promise<string> {
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
      // Record from default input device to WAV file
      // On Windows, sox requires -t waveaudio and device specification
      recordingProcess = spawn(soxPath, [
        '-t', 'waveaudio',  // Windows audio driver
        'default',          // default input device
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

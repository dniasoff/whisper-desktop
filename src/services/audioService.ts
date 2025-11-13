import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Patch node-mic BEFORE importing to find sox in unpacked location
const appPath = app.getAppPath();
const resourcesDir = path.join(appPath, '..', 'resources');
const unpackedSoxPath = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', 'node-mic', 'sox-win32', 'sox.exe');

if (fs.existsSync(unpackedSoxPath)) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const binsModule = require('node-mic/dist/bins');
    if (binsModule && typeof binsModule.findSox === 'function') {
      binsModule.findSox = () => unpackedSoxPath;
      binsModule.SOX_WIN32_OUTPUT_BIN = unpackedSoxPath;
    }
  } catch (_e) {
    // Silent fail - sox patching optional
  }
}

import Mic from 'node-mic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let micInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let micStream: any = null;
let recordingStream: fs.WriteStream | null = null;
let isCurrentlyRecording = false;
let recordingResolve: ((audioPath: string) => void) | null = null;
let recordingAudioPath: string | null = null;

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

      recordingResolve = resolve;
      recordingAudioPath = audioPath;

      recordingStream = fs.createWriteStream(audioPath);

      micInstance = new Mic({
        rate: 16000,
        channels: 1,
        debug: false,
      });

      micStream = micInstance.getAudioStream();

      micStream.pipe(recordingStream);
      isCurrentlyRecording = true;

      micStream.on('error', (error: Error) => {
        console.error('Microphone stream error:', error);
        isCurrentlyRecording = false;
        recordingResolve = null;
        recordingAudioPath = null;
        reject(error);
      });

      const recordingTimeout = setTimeout(() => {
        stopRecording().catch(reject);
      }, 60000);

      micInstance.start();

      // Disable silence detection as it's too aggressive and cuts off last words
      // User can manually stop recording or let it timeout after 60 seconds
      // micStream.on('silence', () => {
      //   clearTimeout(recordingTimeout);
      //   stopRecording().catch(reject);
      // });

    } catch (error) {
      console.error('Error starting recording:', error);
      recordingResolve = null;
      recordingAudioPath = null;
      reject(error);
    }
  });
}

export async function stopRecording(): Promise<void> {
  return new Promise((resolve) => {
    try {
      isCurrentlyRecording = false;

      if (micInstance) {
        micInstance.stop();
        micInstance = null;
      }

      if (recordingStream && micStream) {
        let finished = false;
        const finishRecording = () => {
          if (finished) return;
          finished = true;

          const audioPath = recordingAudioPath;
          recordingAudioPath = null;
          micStream = null;

          if (recordingResolve && audioPath) {
            recordingResolve(audioPath);
            recordingResolve = null;
          }

          resolve();
        };

        recordingStream.once('finish', finishRecording);
        recordingStream.once('close', finishRecording);
        recordingStream.once('error', (error) => {
          console.error('Recording stream error:', error);
          finishRecording();
        });

        const timeout = setTimeout(() => {
          finishRecording();
        }, 5000);

        try {
          // Unpipe the mic stream to signal end of data
          micStream.unpipe(recordingStream);

          // Wait a small moment for any buffered data to settle, then end the write stream
          setImmediate(() => {
            if (recordingStream) {
              recordingStream.end(() => {
                clearTimeout(timeout);
                finishRecording();
              });
            } else {
              clearTimeout(timeout);
              finishRecording();
            }
          });
        } catch (e) {
          console.error('Error ending stream:', e);
          clearTimeout(timeout);
          finishRecording();
        }
      } else if (recordingStream) {
        let finished = false;
        const finishRecording = () => {
          if (finished) return;
          finished = true;

          const audioPath = recordingAudioPath;
          recordingAudioPath = null;

          if (recordingResolve && audioPath) {
            recordingResolve(audioPath);
            recordingResolve = null;
          }

          resolve();
        };

        recordingStream.once('finish', finishRecording);
        recordingStream.once('close', finishRecording);
        recordingStream.once('error', (error) => {
          console.error('Recording stream error:', error);
          finishRecording();
        });

        const timeout = setTimeout(() => {
          finishRecording();
        }, 5000);

        recordingStream.end(() => {
          clearTimeout(timeout);
          finishRecording();
        });

        recordingStream = null;
      } else {
        resolve();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      resolve();
    }
  });
}

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

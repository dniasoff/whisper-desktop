import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MicType = any;

/**
 * Creates a Mic instance with corrected path resolution for electron apps.
 *
 * When electron-builder unpacks node_modules/node-mic with asarUnpack,
 * it extracts files to app.asar.unpacked/node_modules/node-mic. However,
 * node-mic uses relative __dirname paths that still point to the .asar
 * location. This wrapper monkey-patches node-mic to look in the correct
 * unpacked location.
 */
export function createMicInstance(options: Record<string, unknown>): MicType {
  // Get the app's resource path
  const resourcePath = process.resourcesPath || app.getAppPath();

  // Check if we're running from an asar archive
  // app.asar file is in the resources directory
  const asarPath = path.join(path.dirname(resourcePath), 'app.asar');
  const isAsar = fs.existsSync(asarPath) || resourcePath.includes('.asar');

  if (isAsar) {
    try {
      // Construct the unpacked sox path
      const resourcesDir = resourcePath.includes('.asar')
        ? path.dirname(resourcePath)
        : resourcePath;

      const unpackedSoxDir = path.join(
        resourcesDir,
        'app.asar.unpacked',
        'node_modules',
        'node-mic',
        'sox-win32'
      );

      const unpackedSoxPath = path.join(unpackedSoxDir, 'sox.exe');

      // If the unpacked sox exists, patch node-mic's bins module
      if (fs.existsSync(unpackedSoxPath)) {
        // Monkey-patch the bins module that node-mic uses
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
          const binsModule = require('node-mic/dist/bins');

          // Override the SOX_WIN32_OUTPUT_BIN constant
          if (binsModule && binsModule.SOX_WIN32_OUTPUT_BIN) {
            // Cache the old value
            const oldFindSox = binsModule.findSox as () => string;

            // Replace findSox function
            binsModule.findSox = function() {
              // First try the unpacked location
              if (fs.existsSync(unpackedSoxPath)) {
                return unpackedSoxPath;
              }
              // Fall back to original implementation
              return oldFindSox.call(this);
            };
          }
        } catch (e) {
          console.warn('Could not patch node-mic bins module:', e);
        }
      }
    } catch (error) {
      console.warn('Error setting up node-mic path patch:', error);
    }
  }

  // Dynamically require node-mic after patching is setup
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  let MicModule = require('node-mic');

  // Handle both default export and direct constructor export
  if (MicModule && typeof MicModule === 'object' && MicModule.default) {
    MicModule = MicModule.default;
  }

  // Create and return the Mic instance
  return new MicModule(options);
}

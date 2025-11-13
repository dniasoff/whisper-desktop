import { clipboard } from "electron";
import { keyboard, Key } from "@nut-tree-fork/nut-js";

/**
 * Sleep utility for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Write to clipboard with verification and retry logic
 * This ensures the clipboard write succeeds even when the clipboard is contended
 */
async function writeClipboardWithVerification(text: string): Promise<boolean> {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      clipboard.writeText(text);

      // Wait for clipboard propagation
      await sleep(50);

      // Verify write succeeded
      const readBack = clipboard.readText();
      if (readBack === text) {
        return true;
      }

      console.warn(`Clipboard write verification failed (attempt ${i + 1}/${maxRetries})`);
      await sleep(100); // Wait before retry
    } catch (error) {
      console.error(`Clipboard write error (attempt ${i + 1}/${maxRetries}):`, error);
      await sleep(100); // Wait before retry
    }
  }

  return false;
}

/**
 * Send paste keystroke using nut-js
 */
async function sendPaste(): Promise<void> {
  await keyboard.type(Key.LeftControl, Key.V);
}

/**
 * Paste transcript to the active window using clipboard
 * This is the main function to call when you want to paste text
 *
 * Enhanced with clipboard verification, retries, and longer delays for reliability
 *
 * @param text The text to paste
 * @param restoreClipboard Whether to restore the previous clipboard content after pasting (default: true)
 */
export async function pasteTranscriptClipboard(
  text: string,
  restoreClipboard: boolean = true
): Promise<void> {
  let previousClipboard = "";

  try {
    if (restoreClipboard) {
      previousClipboard = clipboard.readText();
    }

    const success = await writeClipboardWithVerification(text);
    if (!success) {
      throw new Error('Failed to write to clipboard after retries');
    }

    await sleep(200);
    await sendPaste();
    await sleep(500);

    if (restoreClipboard && previousClipboard) {
      await writeClipboardWithVerification(previousClipboard);
    }
  } catch (error) {
    if (restoreClipboard && previousClipboard) {
      try {
        clipboard.writeText(previousClipboard);
      } catch (restoreError) {
        // Silent fail
      }
    }
    throw error;
  }
}

/**
 * Copy text to clipboard without pasting
 * Useful for manual copy operations
 */
export function copyToClipboard(text: string): void {
  clipboard.writeText(text);
}

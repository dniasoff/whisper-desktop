import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let wasAlreadyMuted = false;

/**
 * Safe console log that won't throw on broken pipe
 */
function safeLog(...args: unknown[]): void {
  try {
    console.log(...args);
  } catch {
    // Ignore EPIPE and other logging errors
  }
}

/**
 * Safe console error that won't throw on broken pipe
 */
function safeError(...args: unknown[]): void {
  try {
    console.error(...args);
  } catch {
    // Ignore EPIPE and other logging errors
  }
}

/**
 * Check if system audio is currently muted
 */
async function isMuted(): Promise<boolean> {
  try {
    const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int f0(); int f1(); int f2(); int f3(); int f4(); int f5(); int f6(); int f7(); int f8(); int f9();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, IntPtr pguidEventContext);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int f0();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

public class Audio {
    public static bool IsMuted() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        object o;
        var guid = typeof(IAudioEndpointVolume).GUID;
        dev.Activate(ref guid, 23, IntPtr.Zero, out o);
        var vol = (IAudioEndpointVolume)o;
        bool mute;
        vol.GetMute(out mute);
        return mute;
    }
}
'@
[Audio]::IsMuted()
`;
    const { stdout } = await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/'/g, "''")}"`,
      { windowsHide: true, timeout: 10000 }
    );
    return stdout.trim().toLowerCase() === 'true';
  } catch (error) {
    safeError('Error checking mute state:', error);
    return false; // Assume not muted if we can't check
  }
}

/**
 * Send volume mute key to toggle mute state
 */
async function sendMuteKey(): Promise<void> {
  try {
    // Use PowerShell to send the volume mute key (VK_VOLUME_MUTE = 0xAD = 173)
    await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`,
      { windowsHide: true, timeout: 5000 }
    );
  } catch (error) {
    safeError('Error sending mute key:', error);
    throw error;
  }
}

/**
 * Check mute state and mute audio for recording (if not already muted)
 */
export async function saveAndMuteAudio(): Promise<void> {
  try {
    // Check if already muted
    wasAlreadyMuted = await isMuted();
    safeLog('Audio already muted:', wasAlreadyMuted);

    if (!wasAlreadyMuted) {
      // Only mute if not already muted
      safeLog('Muting audio for recording');
      await sendMuteKey();
    } else {
      safeLog('Audio already muted, skipping mute');
    }
  } catch (error) {
    safeError('Error muting audio:', error);
    throw error;
  }
}

/**
 * Restore audio (unmute) after recording if we muted it
 */
export async function restoreAudio(): Promise<void> {
  try {
    if (!wasAlreadyMuted) {
      // Only unmute if we were the ones who muted it
      safeLog('Unmuting audio after recording');
      await sendMuteKey();
    } else {
      safeLog('Audio was already muted before recording, leaving muted');
    }
  } catch (error) {
    safeError('Error restoring audio:', error);
    throw error;
  }
}

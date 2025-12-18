import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VolumeState {
  volume: number;
  isMuted: boolean;
}

let previousVolumeState: VolumeState | null = null;

/**
 * Get current system volume and mute state (Windows only)
 * Uses PowerShell with COM to access Windows Audio APIs
 */
export async function getCurrentVolume(): Promise<VolumeState> {
  try {
    const script = `
      Add-Type -TypeDefinition @"
      using System.Runtime.InteropServices;
      [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioEndpointVolume {
        int NotImpl1(); int NotImpl2();
        int GetChannelCount(out int channelCount);
        int SetMasterVolumeLevel(float level, System.Guid eventContext);
        int SetMasterVolumeLevelScalar(float level, System.Guid eventContext);
        int GetMasterVolumeLevel(out float level);
        int GetMasterVolumeLevelScalar(out float level);
        int SetChannelVolumeLevel(uint channelNumber, float level, System.Guid eventContext);
        int SetChannelVolumeLevelScalar(uint channelNumber, float level, System.Guid eventContext);
        int GetChannelVolumeLevel(uint channelNumber, out float level);
        int GetChannelVolumeLevelScalar(uint channelNumber, out float level);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, System.Guid eventContext);
        int GetMute(out bool isMuted);
      }
"@
      $deviceEnumeratorType = [Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")
      $deviceEnumerator = [Activator]::CreateInstance($deviceEnumeratorType)
      $defaultDevice = $deviceEnumerator.GetDefaultAudioEndpoint(0, 1)
      $audioEndpointVolumeType = [Type]::GetTypeFromCLSID([Guid]"5CDF2C82-841E-4546-9722-0CF74078229A")
      $audioEndpointVolume = [System.Runtime.InteropServices.Marshal]::GetComInterfaceForObject($defaultDevice, [IAudioEndpointVolume])
      $volumeInterface = [System.Runtime.InteropServices.Marshal]::GetTypedObjectForIUnknown($audioEndpointVolume, [IAudioEndpointVolume])
      [float]$volume = 0; $volumeInterface.GetMasterVolumeLevelScalar([ref]$volume)
      [bool]$muted = $false; $volumeInterface.GetMute([ref]$muted)
      Write-Output "$([Math]::Round($volume * 100)),$muted"
    `;

    const { stdout } = await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { windowsHide: true }
    );

    const [volumeStr, mutedStr] = stdout.trim().split(',');
    const volume = parseFloat(volumeStr);
    const isMuted = mutedStr.toLowerCase() === 'true';

    return {
      volume: isNaN(volume) ? 100 : volume,
      isMuted
    };
  } catch (error) {
    console.error('Error getting current volume:', error);
    return { volume: 100, isMuted: false };
  }
}

/**
 * Set system volume (Windows only)
 * @param volume - Volume level (0-100)
 */
export async function setVolume(volume: number): Promise<void> {
  try {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    const volumeScalar = clampedVolume / 100;

    const script = `
      Add-Type -TypeDefinition @"
      using System.Runtime.InteropServices;
      [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioEndpointVolume {
        int NotImpl1(); int NotImpl2();
        int GetChannelCount(out int channelCount);
        int SetMasterVolumeLevel(float level, System.Guid eventContext);
        int SetMasterVolumeLevelScalar(float level, System.Guid eventContext);
        int GetMasterVolumeLevel(out float level);
        int GetMasterVolumeLevelScalar(out float level);
      }
"@
      $deviceEnumeratorType = [Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")
      $deviceEnumerator = [Activator]::CreateInstance($deviceEnumeratorType)
      $defaultDevice = $deviceEnumerator.GetDefaultAudioEndpoint(0, 1)
      $audioEndpointVolumeType = [Type]::GetTypeFromCLSID([Guid]"5CDF2C82-841E-4546-9722-0CF74078229A")
      $audioEndpointVolume = [System.Runtime.InteropServices.Marshal]::GetComInterfaceForObject($defaultDevice, [IAudioEndpointVolume])
      $volumeInterface = [System.Runtime.InteropServices.Marshal]::GetTypedObjectForIUnknown($audioEndpointVolume, [IAudioEndpointVolume])
      $guid = [Guid]::Empty
      $volumeInterface.SetMasterVolumeLevelScalar(${volumeScalar}, $guid)
    `;

    await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { windowsHide: true }
    );
  } catch (error) {
    console.error('Error setting volume:', error);
    throw error;
  }
}

/**
 * Mute system audio (Windows only)
 */
export async function muteAudio(): Promise<void> {
  try {
    const script = `
      Add-Type -TypeDefinition @"
      using System.Runtime.InteropServices;
      [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioEndpointVolume {
        int NotImpl1(); int NotImpl2(); int NotImpl3(); int NotImpl4(); int NotImpl5(); int NotImpl6(); int NotImpl7(); int NotImpl8(); int NotImpl9(); int NotImpl10();
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, System.Guid eventContext);
      }
"@
      $deviceEnumeratorType = [Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")
      $deviceEnumerator = [Activator]::CreateInstance($deviceEnumeratorType)
      $defaultDevice = $deviceEnumerator.GetDefaultAudioEndpoint(0, 1)
      $audioEndpointVolumeType = [Type]::GetTypeFromCLSID([Guid]"5CDF2C82-841E-4546-9722-0CF74078229A")
      $audioEndpointVolume = [System.Runtime.InteropServices.Marshal]::GetComInterfaceForObject($defaultDevice, [IAudioEndpointVolume])
      $volumeInterface = [System.Runtime.InteropServices.Marshal]::GetTypedObjectForIUnknown($audioEndpointVolume, [IAudioEndpointVolume])
      $guid = [Guid]::Empty
      $volumeInterface.SetMute($true, $guid)
    `;

    await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { windowsHide: true }
    );
  } catch (error) {
    console.error('Error muting audio:', error);
    throw error;
  }
}

/**
 * Unmute system audio (Windows only)
 */
export async function unmuteAudio(): Promise<void> {
  try {
    const script = `
      Add-Type -TypeDefinition @"
      using System.Runtime.InteropServices;
      [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioEndpointVolume {
        int NotImpl1(); int NotImpl2(); int NotImpl3(); int NotImpl4(); int NotImpl5(); int NotImpl6(); int NotImpl7(); int NotImpl8(); int NotImpl9(); int NotImpl10();
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, System.Guid eventContext);
      }
"@
      $deviceEnumeratorType = [Type]::GetTypeFromCLSID([Guid]"BCDE0395-E52F-467C-8E3D-C4579291692E")
      $deviceEnumerator = [Activator]::CreateInstance($deviceEnumeratorType)
      $defaultDevice = $deviceEnumerator.GetDefaultAudioEndpoint(0, 1)
      $audioEndpointVolumeType = [Type]::GetTypeFromCLSID([Guid]"5CDF2C82-841E-4546-9722-0CF74078229A")
      $audioEndpointVolume = [System.Runtime.InteropServices.Marshal]::GetComInterfaceForObject($defaultDevice, [IAudioEndpointVolume])
      $volumeInterface = [System.Runtime.InteropServices.Marshal]::GetTypedObjectForIUnknown($audioEndpointVolume, [IAudioEndpointVolume])
      $guid = [Guid]::Empty
      $volumeInterface.SetMute($false, $guid)
    `;

    await execAsync(
      `powershell -ExecutionPolicy Bypass -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { windowsHide: true }
    );
  } catch (error) {
    console.error('Error unmuting audio:', error);
    throw error;
  }
}

/**
 * Save current volume state and mute audio for recording
 */
export async function saveAndMuteAudio(): Promise<void> {
  try {
    // Store current state
    previousVolumeState = await getCurrentVolume();
    console.log('Saved audio state:', previousVolumeState);

    // Mute the audio
    await muteAudio();

    // Also set volume to 0 as a fallback
    await setVolume(0);
  } catch (error) {
    console.error('Error saving and muting audio:', error);
    throw error;
  }
}

/**
 * Restore previously saved volume state after recording
 */
export async function restoreAudio(): Promise<void> {
  try {
    if (!previousVolumeState) {
      console.warn('No previous volume state to restore');
      return;
    }

    console.log('Restoring audio state:', previousVolumeState);

    // Restore volume level
    await setVolume(previousVolumeState.volume);

    // Restore mute state
    if (previousVolumeState.isMuted) {
      await muteAudio();
    } else {
      await unmuteAudio();
    }

    // Clear saved state
    previousVolumeState = null;
  } catch (error) {
    console.error('Error restoring audio:', error);
    throw error;
  }
}

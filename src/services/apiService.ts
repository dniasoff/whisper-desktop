import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

class WhisperAPI {
  private client: AxiosInstance = axios.create();
  private apiUrl: string = 'http://127.0.0.1:4444';
  private apiToken: string = '';
  private language: string = 'en';

  constructor() {
    this.updateClient();
  }

  private updateClient() {
    const headers: any = { 'User-Agent': 'whisper-desktop' };
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers,
    });
  }

  setConfig(apiUrl: string, apiToken: string, language: string = 'en') {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.language = language;
    this.updateClient();
  }

  /**
   * Check if the Whisper API is healthy
   */
  async health(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/health');
      console.warn('API health check:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  /**
   * Transcribe audio file using the Whisper API
   * @param audioPath Path to the audio file
   * @returns Transcribed text
   */
  async transcribe(audioPath: string): Promise<string> {
    let fileStream: fs.ReadStream | null = null;
    try {
      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      fileStream = fs.createReadStream(audioPath);
      const formData = new FormData();
      formData.append('file', fileStream);
      formData.append('language', this.language);

      const response = await this.client.post('/v1/audio/transcriptions', formData, {
        headers: formData.getHeaders(),
      });

      // Ensure stream is closed
      fileStream.destroy();
      fileStream = null;

      if (response.data && response.data.text) {
        return response.data.text;
      }

      throw new Error('Invalid response from API');
    } catch (error) {
      // Ensure stream is closed on error
      if (fileStream) {
        fileStream.destroy();
      }
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Alternative transcribe endpoint
   * @param audioPath Path to the audio file
   * @returns Transcribed text
   */
  async transcribeAlias(audioPath: string): Promise<string> {
    let fileStream: fs.ReadStream | null = null;
    try {
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      fileStream = fs.createReadStream(audioPath);
      const formData = new FormData();
      formData.append('file', fileStream);
      formData.append('language', this.language);

      const response = await this.client.post('/transcribe', formData, {
        headers: formData.getHeaders(),
      });

      // Ensure stream is closed
      fileStream.destroy();
      fileStream = null;

      if (response.data && response.data.text) {
        return response.data.text;
      }

      throw new Error('Invalid response from API');
    } catch (error) {
      // Ensure stream is closed on error
      if (fileStream) {
        fileStream.destroy();
      }
      console.error('Transcription alias error:', error);
      throw error;
    }
  }
}

const whisperAPI = new WhisperAPI();

/**
 * Transcribe an audio file
 * @param audioPath Path to the audio file
 * @returns Transcribed text
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  return whisperAPI.transcribe(audioPath);
}

/**
 * Check API health before recording
 * @returns True if API is healthy
 */
export async function checkAPIHealth(): Promise<boolean> {
  return whisperAPI.health();
}

/**
 * Configure API endpoint, token, and language
 */
export function setApiConfig(apiUrl: string, apiToken: string, language: string = 'en'): void {
  whisperAPI.setConfig(apiUrl, apiToken, language);
}

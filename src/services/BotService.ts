import { MedplumClient } from '@medplum/core';
import { Bot, Practitioner, Extension } from '@medplum/fhirtypes';

interface TranscriptionResponse {
  message: string;
  details: {
    transcript: string;
  };
}

interface BotOptions {
  stream?: boolean;
  maxTokens?: number;
  responseFormat?: {
    type: string;
  };
  temperature?: number;
  referencePreference?: string;
}

export class BotService {
  private static readonly TRANSCRIPTION_BOT_ID = '@https://progressnotes.app/bots:audio-transcribe';
  private static readonly NOTE_GENERATION_BOT_ID = '@https://progressnotes.app:ask-claude';
  private isLocalhost: boolean;
  private baseUrl: string;

  constructor(private medplum: MedplumClient) {
    // Check if we're running against localhost
    this.isLocalhost = medplum.getBaseUrl().includes('localhost');
    this.baseUrl = medplum.getBaseUrl();
  }

  private checkBotAvailability(): void {
    if (this.baseUrl.includes('app.medplum.com')) {
      throw new Error(
        'Bots are only available when running against a self-hosted Medplum server. ' +
        'If you\'re seeing this message, you\'re running against app.medplum.com. ' +
        'To use bots, please run your own Medplum server and ensure your baseUrl is configured correctly.'
      );
    }
  }

  async transcribeAudio(audioData: Uint8Array, contentType: string): Promise<string> {
    try {
      this.checkBotAvailability();

      // Upload audio as binary
      const binary = await this.medplum.createBinary({
        data: audioData,
        contentType: contentType
      });

      // Call transcription bot
      const response = await this.medplum.executeBot(
        {
          system: 'https://progressnotes.app/bots',
          value: 'audio-transcribe'
        },
        {
          type: 'audio',
          binaryId: binary.id
        },
        'application/json'
      ) as TranscriptionResponse;

      if (!response?.details?.transcript) {
        throw new Error('No transcript received from transcription service');
      }

      return response.details.transcript;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Bots are only available')) {
        throw err;
      }
      console.error('Transcription error:', err);
      throw new Error(`Transcription failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async generateNote(prompt: string, options: BotOptions = {}): Promise<any> {
    try {
      this.checkBotAvailability();

      // Get user's reference preference, default to 'client' if not set
      const profile = await this.medplum.getProfile() as Practitioner;
      const referenceExt = profile.extension?.find(
        (e: Extension) => e.url === 'https://progress.care/fhir/reference-preference'
      );
      const referencePreference = referenceExt?.valueString || 'client';

      const defaultOptions: BotOptions = {
        stream: true,
        maxTokens: 4000,
        responseFormat: {
          type: "json"
        },
        temperature: 0.1,
        referencePreference: referencePreference
      };

      const botResponse = await this.medplum.executeBot(
        {
          system: 'https://progressnotes.app',
          value: 'ask-claude'
        },
        {
          prompt,
          ...defaultOptions,
          ...options
        },
        'application/json'
      );

      if (!botResponse) {
        throw new Error('No response received from note generation service');
      }

      return this.parseNoteResponse(botResponse);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Bots are only available')) {
        throw err;
      }
      console.error('Note generation error:', err);
      throw new Error(`Note generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  parseNoteResponse(response: string | { text: string }): any {
    console.log('Raw response from Claude:', response);
    try {
      // Extract the text content from the response
      const responseText = typeof response === 'string' ? response : response.text;
      
      if (!responseText) {
        throw new Error('Empty response from bot');
      }

      // Try to find JSON content between first { and last }
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      const jsonStr = jsonMatch[0];
      console.log('Extracted JSON string:', jsonStr);
      
      // Clean up the JSON string:
      // 1. Remove any control characters
      // 2. Fix any truncated content (ending with ...)
      // 3. Ensure proper line breaks
      const cleanJson = jsonStr
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/…/g, '...') // Replace ellipsis
        .replace(/\r\n|\r|\n/g, '\\n') // Convert actual line breaks to \n strings
        .replace(/\s*\\n\s*/g, '\\n') // Normalize spacing around \n
        .replace(/([.!?])\s*\\n/g, '$1\\n\\n') // Add paragraph breaks after sentences
        .replace(/\s+/g, ' ') // Normalize other whitespace
        .replace(/\\n\s+/g, '\\n') // Clean up spaces after \n
        .replace(/\s+\\n/g, '\\n'); // Clean up spaces before \n
      
      console.log('Cleaned JSON string:', cleanJson);
      
      const parsed = JSON.parse(cleanJson);
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error('Invalid response format: missing sections array');
      }
      
      return parsed;
    } catch (e) {
      console.error('Error parsing response:', response);
      console.error('Parse error:', e);
      throw new Error(`Error parsing bot response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
} 

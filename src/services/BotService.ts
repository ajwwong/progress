import { MedplumClient } from '@medplum/core';

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
}

export class BotService {
  private static readonly TRANSCRIPTION_BOT_ID = '1255675e-266d-4ab9-bc69-a850c6ca4875';
  private static readonly NOTE_GENERATION_BOT_ID = '5731008c-42a6-4fdc-8969-2560667b4f1d';

  constructor(private medplum: MedplumClient) {}

  async transcribeAudio(audioData: Uint8Array, contentType: string): Promise<string> {
    try {
      // Upload audio as binary
      const binary = await this.medplum.createBinary({
        data: audioData,
        contentType: contentType
      });

      // Call transcription bot
      const response = await this.medplum.executeBot(
        BotService.TRANSCRIPTION_BOT_ID,
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
      console.error('Transcription error:', err);
      throw new Error(`Transcription failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async generateNote(prompt: string, options: BotOptions = {}): Promise<any> {
    try {
      const defaultOptions: BotOptions = {
        stream: true,
        maxTokens: 4000,
        responseFormat: {
          type: "json"
        },
        temperature: 0.1,
      };

      const botResponse = await this.medplum.executeBot(
        BotService.NOTE_GENERATION_BOT_ID,
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

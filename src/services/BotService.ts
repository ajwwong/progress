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

  private parseNoteResponse(botResponse: any): any {
    const responseText = typeof botResponse === 'string' 
      ? botResponse 
      : botResponse.text || botResponse.content?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from bot');
    }

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    // Clean the JSON string
    const cleanJson = jsonMatch[0]
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\\[rn]/g, '\\n')
      .replace(/\s+/g, ' ');
    
    try {
      const parsedContent = JSON.parse(cleanJson);
      
      if (!parsedContent?.sections) {
        throw new Error('Invalid note format: missing sections array');
      }

      return parsedContent;
    } catch (parseErr) {
      console.error('Error parsing bot response:', parseErr);
      if (typeof botResponse === 'string' || botResponse.text) {
        const text = (typeof botResponse === 'string' ? botResponse : botResponse.text) || '';
        return {
          sections: [
            {
              title: 'Progress Note',
              content: text
            }
          ]
        };
      }
      throw new Error('Invalid response format from bot. Expected JSON.');
    }
  }
} 

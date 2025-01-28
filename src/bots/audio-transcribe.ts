import { BotEvent, MedplumClient } from '@medplum/core';
import { writeFileSync } from 'fs';
import { Buffer } from 'node:buffer';
import { createClient } from '@deepgram/sdk';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  try {
    // Get the API key from secrets
    const deepgramApiKey = event.secrets['DEEPGRAM_API_KEY']?.valueString;
    if (!deepgramApiKey) {
      throw new Error('DEEPGRAM_API_KEY not found in secrets');
    }

    // Initialize Deepgram with the API key from secrets
    const deepgram = createClient(deepgramApiKey);
    
    const input = event.input;
    
    if (input.type === 'audio' && input.binaryId) {
      console.log('Getting audio from Binary storage...');
      
      // Get the audio content
      const response = await medplum.download(`Binary/${input.binaryId}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      console.log('Transcribing audio...');
      // Using the correct V3 syntax
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          diarize: true
        }
      );

      if (error) throw error;

      return {
        message: 'Audio transcribed successfully',
        details: {
          transcript: result.results?.channels[0]?.alternatives[0]?.transcript || 'No transcript available',
          confidence: result.results?.channels[0]?.alternatives[0]?.confidence,
          audioSize: audioBuffer.length,
          duration: result.metadata?.duration
        }
      };
    }
    
    return {
      message: 'Unexpected input type',
      received: input
    };
  } catch (error) {
    return {
      error: 'Failed to process',
      details: error.message,
      stack: error.stack
    };
  }
}
import { BotEvent, MedplumClient } from '@medplum/core';
import { createClient } from '@deepgram/sdk';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const debugLog: string[] = [];
  const log = async (message: string) => {
    debugLog.push(message);
    // Create Communication resource for logging
    await medplum.createResource({
      resourceType: 'Communication',
      status: 'completed',
      category: [{
        coding: [{
          system: 'http://terminology.medplum.org/communication-categories',
          code: 'audio-transcription-log'
        }]
      }],
      payload: [{
        contentString: message
      }]
    });
  };

  try {
    if (!event.secrets['DEEPGRAM_API_KEY']?.valueString) {
      await log('Error: Deepgram API key not found in bot secrets');
      throw new Error('Deepgram API key not found in bot secrets');
    }

    // Initialize Deepgram
    const deepgram = createClient(event.secrets['DEEPGRAM_API_KEY'].valueString);
    await log('Deepgram client initialized');

    // Get the binary data from the input
    if (!event.input.type === 'audio' || !event.input.binaryId) {
      await log('Error: Invalid input format - missing audio type or binaryId');
      throw new Error('Invalid input format. Expected {type: "audio", binaryId: string}');
    }

    await log(`Processing binary resource: ${event.input.binaryId}`);
    const binary = await medplum.readResource('Binary', event.input.binaryId);
    
    if (!binary.data) {
      await log('Error: No audio data found in binary resource');
      throw new Error('No audio data found in binary resource');
    }

    await log(`Audio file size: ${binary.data.length} bytes`);
    await log(`Content type: ${binary.contentType || 'audio/wav'}`);

    // Convert base64 to buffer
    const buffer = Buffer.from(binary.data, 'base64');

    // Send to Deepgram
    await log('Sending to Deepgram for transcription...');
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      {
        buffer,
        mimetype: binary.contentType || 'audio/wav'
      },
      {
        model: "nova-2",
        punctuate: true,
      }
    );

    if (error) {
      await log(`Deepgram transcription error: ${JSON.stringify(error)}`);
      throw new Error(`Deepgram transcription error: ${error.message}`);
    }

    const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript;
    const confidence = result?.results?.channels[0]?.alternatives[0]?.confidence;
    
    await log(`Transcription completed. Confidence: ${confidence}`);
    await log(`Transcript length: ${transcript?.length || 0} characters`);

    return {
      details: {
        transcript,
        confidence,
        debugLog
      },
      success: true
    };

  } catch (error) {
    const errorMessage = `Transcription error: ${(error as Error).message}`;
    await log(errorMessage);
    await log(`Stack trace: ${(error as Error).stack}`);
    
    return {
      success: false,
      error: errorMessage,
      debugLog
    };
  }
}
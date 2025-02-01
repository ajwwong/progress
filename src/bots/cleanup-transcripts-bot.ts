import { BotEvent, MedplumClient } from '@medplum/core';
import { BotService } from './BotService';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const botService = new BotService(medplum);
  await botService.cleanupExpiredTranscripts();
  return { message: 'Transcript sections cleaned up successfully' };
} 
import { BotEvent, MedplumClient } from '@medplum/core';
import { Appointment } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const appointment = event.input as Appointment;
  
  // Only process when appointment is marked as fulfilled
  if (appointment.status === 'fulfilled') {
    // Execute the charge bot
    return await medplum.executeBot(
      'stripe-session-charge-bot-id', // Replace with your bot ID after creating it
      appointment,
      'application/json'
    );
  }

  return { success: true, message: 'No action needed' };
}
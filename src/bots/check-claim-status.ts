import { BotEvent, MedplumClient } from '@medplum/core';
import { Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const task = event.input as Task;
  
  try {
    // Simulate checking claim status
    const statuses = ['pending', 'approved', 'denied'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const statusDetails = {
      pending: 'Claim is being processed by the insurance company',
      approved: 'Claim has been approved for payment',
      denied: 'Claim has been denied. Please review and resubmit if necessary'
    };

    // Update task status
    await medplum.updateResource({
      ...task,
      businessStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-status',
          code: randomStatus,
          display: randomStatus.charAt(0).toUpperCase() + randomStatus.slice(1)
        }]
      },
      lastModified: new Date().toISOString(),
      output: [{
        type: {
          text: 'Status Details'
        },
        valueString: statusDetails[randomStatus as keyof typeof statusDetails]
      }]
    });

    return {
      success: true,
      status: randomStatus,
      details: statusDetails[randomStatus as keyof typeof statusDetails]
    };
  } catch (error) {
    console.error('Error checking claim status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check claim status'
    };
  }
}
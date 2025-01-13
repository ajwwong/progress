import { BotEvent, MedplumClient } from '@medplum/core';
import { Invoice, Coverage, Organization, Practitioner } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const superbill = event.input as Invoice;
  
  try {
    // Get insurance coverage
    const coverageRef = superbill.extension?.[0]?.extension?.find(
      e => e.url === 'insurance'
    )?.valueReference?.reference;
    
    if (!coverageRef) {
      throw new Error('No insurance coverage reference found');
    }

    const coverage = await medplum.readResource('Coverage', coverageRef.split('/')[1]);

    // Store claim submission details
    const task = await medplum.createResource({
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      code: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/task-code',
          code: 'claim',
          display: 'Insurance Claim'
        }]
      },
      focus: { reference: `Invoice/${superbill.id}` },
      for: superbill.subject,
      authoredOn: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      businessStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-status',
          code: 'submitted',
          display: 'Submitted'
        }]
      }
    });

    return {
      success: true,
      taskId: task.id,
      status: 'submitted'
    };
  } catch (error) {
    console.error('Error submitting claim:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit claim'
    };
  }
}
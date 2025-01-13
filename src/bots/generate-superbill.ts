import { BotEvent, MedplumClient } from '@medplum/core';
import { Appointment, Invoice, Coverage } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const appointment = event.input as Appointment;
  
  try {
    // Get patient's insurance coverage
    const coverage = await medplum.searchOne('Coverage', {
      patient: appointment.subject?.reference,
      status: 'active'
    });

    if (!coverage) {
      return { success: false, message: 'No active insurance coverage found' };
    }

    // Get provider details
    const provider = await medplum.readResource('Practitioner', 
      appointment.participant?.[0]?.actor?.reference?.split('/')[1] || ''
    );

    // Create superbill
    const superbill = await medplum.createResource<Invoice>({
      resourceType: 'Invoice',
      status: 'issued',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/invoice-type',
          code: 'superbill',
          display: 'Superbill'
        }]
      },
      subject: appointment.subject,
      date: new Date().toISOString(),
      lineItem: [{
        chargeItemCodeableConcept: {
          coding: [{
            system: 'http://www.ama-assn.org/go/cpt',
            code: '90834',
            display: 'Psychotherapy, 45 minutes'
          }]
        },
        priceComponent: [{
          type: 'base',
          amount: {
            value: 150.00,
            currency: 'USD'
          }
        }]
      }],
      totalGross: {
        value: 150.00,
        currency: 'USD'
      },
      totalNet: {
        value: 150.00,
        currency: 'USD'
      },
      extension: [{
        url: 'http://example.com/fhir/StructureDefinition/superbill-details',
        extension: [{
          url: 'diagnosis',
          valueCodeableConcept: {
            coding: [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'F41.1',
              display: 'Generalized anxiety disorder'
            }]
          }
        }, {
          url: 'insurance',
          valueReference: {
            reference: `Coverage/${coverage.id}`
          }
        }]
      }]
    });

    return {
      success: true,
      superbillId: superbill.id
    };
  } catch (error) {
    console.error('Error generating superbill:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate superbill'
    };
  }
}
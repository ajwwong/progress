import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition, Patient, Practitioner, Reference } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';

interface UseActiveCompositionReturn {
  savedComposition: Composition | undefined;
  createInitialComposition: (patient: Patient) => Promise<Composition>;
  updateCompositionSections: (sections: Composition['section']) => Promise<Composition>;
}

export function useActiveComposition(): UseActiveCompositionReturn {
  const medplum = useMedplum();
  const [savedComposition, setSavedComposition] = useState<Composition>();

  const createInitialComposition = async (patient: Patient): Promise<Composition> => {
    const profile = await medplum.getProfile() as Practitioner;
    if (!profile) {
      throw new Error('No practitioner profile found');
    }

    const practitionerName = profile.name?.[0] ? 
      `${profile.name[0].given?.[0] || ''} ${profile.name[0].family || ''}`.trim() : 
      'Unknown Practitioner';

    const initialComposition: Composition = {
      resourceType: 'Composition',
      status: 'preliminary',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '11488-4',
          display: 'Consultation note'
        }]
      },
      date: new Date().toISOString(),
      title: 'Therapy Session Notes',
      author: [{
        reference: `Practitioner/${profile.id}`,
        display: practitionerName
      }],
      subject: {
        reference: `Patient/${patient.id}`,
        display: getDisplayString(patient)
      },
      section: []
    };

    const created = await medplum.createResource(initialComposition);
    setSavedComposition(created as Composition);
    return created as Composition;
  };

  const updateCompositionSections = async (sections: Composition['section']): Promise<Composition> => {
    if (!savedComposition) {
      throw new Error('No composition to update');
    }

    const updatedComposition: Composition = {
      ...savedComposition,
      section: sections
    };

    const updated = await medplum.updateResource(updatedComposition);
    setSavedComposition(updated as Composition);
    return updated as Composition;
  };

  return {
    savedComposition,
    createInitialComposition,
    updateCompositionSections
  };
} 
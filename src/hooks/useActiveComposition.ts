import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition, Patient, Practitioner } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { NoteTemplate } from '../components/templates/types';

interface UseActiveCompositionReturn {
  savedComposition: Composition | undefined;
  createInitialComposition: (patient: Patient, template?: NoteTemplate) => Promise<Composition>;
  updateCompositionSections: (sections: Composition['section']) => Promise<Composition>;
  addTranscriptSection: (transcript: string) => Promise<Composition>;
  addNoteSection: (noteContent: { sections: Array<{ title: string; content: string }> }) => Promise<Composition>;
}

export function useActiveComposition(): UseActiveCompositionReturn {
  const medplum = useMedplum();
  const [savedComposition, setSavedComposition] = useState<Composition>();

  const createInitialComposition = async (patient: Patient, template?: NoteTemplate): Promise<Composition> => {
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
      title: 'Progress Note',
      author: [{
        reference: `Practitioner/${profile.id}`,
        display: practitionerName
      }],
      subject: {
        reference: `Patient/${patient.id}`,
        display: getDisplayString(patient)
      },
      section: [],
      extension: template ? [
        {
          url: 'http://example.com/fhir/StructureDefinition/note-template',
          valueString: template.id
        }
      ] : undefined
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

  const addTranscriptSection = async (transcript: string): Promise<Composition> => {
    if (!savedComposition) {
      throw new Error('No composition to update');
    }

    const updatedComposition: Composition = {
      ...savedComposition,
      section: [
        ...(savedComposition.section || []).filter(s => s.title !== 'Transcript'),
        {
          title: 'Transcript',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${transcript}</div>`
          }
        }
      ]
    };

    const updated = await medplum.updateResource(updatedComposition);
    setSavedComposition(updated as Composition);
    return updated as Composition;
  };

  const addNoteSection = async (noteContent: { sections: Array<{ title: string; content: string }> }): Promise<Composition> => {
    if (!savedComposition) {
      throw new Error('No composition to update');
    }

    const compositionSections = noteContent.sections.map(section => ({
      title: section.title,
      text: {
        status: 'generated' as const,
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.content}</div>`
      }
    }));

    const updatedComposition: Composition = {
      ...savedComposition,
      section: [
        ...compositionSections,
        // Preserve transcript section if it exists
        ...(savedComposition.section || []).filter(s => s.title === 'Transcript')
      ]
    };

    const updated = await medplum.updateResource(updatedComposition);
    setSavedComposition(updated as Composition);
    return updated as Composition;
  };

  return {
    savedComposition,
    createInitialComposition,
    updateCompositionSections,
    addTranscriptSection,
    addNoteSection
  };
} 
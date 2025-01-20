import { useState, useCallback, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { Patient, Composition, Bundle, Reference, CodeableConcept } from '@medplum/fhirtypes';
import { notifications } from '@mantine/notifications';

export interface NoteSection {
  title: string;
  content: string;
}

export interface Note {
  id: string;
  title: string;
  date: string;
  type: {
    code: string;
    display: string;
  };
  sections: NoteSection[];
  status: Composition['status'];
  author?: string;
  template?: string;
}

export interface UsePatientNotesResult {
  notes: Note[];
  isLoading: boolean;
  error: Error | null;
  createNote: (note: Omit<Note, 'id'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refetchNotes: () => Promise<void>;
}

const NOTE_TYPES = {
  PROGRESS: {
    system: 'http://loinc.org',
    code: '11506-3',
    display: 'Progress note'
  },
  CLINICAL: {
    system: 'http://loinc.org',
    code: '11488-4',
    display: 'Consultation note'
  }
} as const;

const getDefaultNoteType = (composition: Composition) => {
  // Try to determine the type from the composition
  const coding = composition.type?.coding?.[0];
  if (coding?.code === NOTE_TYPES.CLINICAL.code) {
    return NOTE_TYPES.CLINICAL;
  }
  // Default to progress note if type is missing or unknown
  return NOTE_TYPES.PROGRESS;
};

const stripHtml = (html: string): string => {
  // Create a temporary div to handle HTML content
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

export function usePatientNotes(patient: Patient): UsePatientNotesResult {
  const medplum = useMedplum();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Search for all compositions for this patient
      const searchResult = await medplum.search('Composition', {
        subject: `Patient/${patient.id}`,
        _sort: '-date',
        _count: '100',
        _include: 'Composition:author'
      });

      console.log('Fetched compositions:', searchResult);

      const notesData = (searchResult as Bundle).entry?.map(entry => {
        const composition = entry.resource as Composition;
        const noteType = getDefaultNoteType(composition);

        // Filter out transcript sections and process remaining sections
        const sections = (composition.section || [])
          .filter(section => section.title?.toLowerCase() !== 'transcript')
          .map(section => {
            let content = '';
            if (section.text?.div) {
              content = stripHtml(section.text.div)
                .replace(/^<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml">/, '')
                .replace(/<\/div>$/, '')
                .trim();
            }
            return {
              title: section.title || '',
              content: content
            };
          });

        console.log('Processing composition:', {
          id: composition.id,
          title: composition.title,
          sections: sections
        });

        return {
          id: composition.id || '',
          title: composition.title || 'Untitled Note',
          date: composition.date || new Date().toISOString(),
          type: {
            code: composition.type?.coding?.[0]?.code || noteType.code,
            display: composition.type?.coding?.[0]?.display || noteType.display
          },
          sections: sections,
          status: composition.status || 'preliminary',
          author: composition.author?.[0]?.display,
          template: composition.extension?.find(e => 
            e.url === 'http://example.com/fhir/StructureDefinition/note-template'
          )?.valueString || 'progress'
        };
      }) || [];

      console.log('Processed notes:', notesData);
      setNotes(notesData);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notes'));
    } finally {
      setIsLoading(false);
    }
  }, [medplum, patient.id]);

  const createNote = async (note: Omit<Note, 'id'>) => {
    try {
      const practitioner = await medplum.getProfile();
      if (!practitioner?.id) {
        throw new Error('No practitioner profile found');
      }

      const composition: Composition = {
        resourceType: 'Composition',
        status: note.status,
        type: {
          coding: [{
            system: NOTE_TYPES[note.type.code === NOTE_TYPES.CLINICAL.code ? 'CLINICAL' : 'PROGRESS'].system,
            code: note.type.code,
            display: note.type.display
          }]
        },
        subject: {
          reference: `Patient/${patient.id}`,
          display: `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`
        },
        author: [{
          reference: `Practitioner/${practitioner.id}`,
          display: practitioner.name?.[0]?.text || 'Unknown'
        }],
        date: note.date,
        title: note.title,
        section: note.sections.map(section => ({
          title: section.title,
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.content}</div>`
          }
        })),
        extension: note.template ? [
          {
            url: 'http://example.com/fhir/StructureDefinition/note-template',
            valueString: note.template
          }
        ] : undefined
      };

      await medplum.createResource(composition);
      await fetchNotes();

      notifications.show({
        title: 'Success',
        message: 'Note created successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Error creating note:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to create note',
        color: 'red'
      });
      throw err;
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const currentNote = await medplum.readResource('Composition', id);
      
      const updatedNote: Composition = {
        ...currentNote,
        status: updates.status || currentNote.status,
        date: updates.date || currentNote.date,
        title: updates.title || currentNote.title,
        type: updates.type ? {
          coding: [{
            system: NOTE_TYPES[updates.type.code === NOTE_TYPES.CLINICAL.code ? 'CLINICAL' : 'PROGRESS'].system,
            code: updates.type.code,
            display: updates.type.display
          }]
        } : currentNote.type,
        section: updates.sections ? 
          updates.sections.map(section => ({
            title: section.title,
            text: {
              status: 'generated',
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.content}</div>`
            }
          })) : 
          currentNote.section,
        extension: updates.template ? [
          {
            url: 'http://example.com/fhir/StructureDefinition/note-template',
            valueString: updates.template
          }
        ] : currentNote.extension
      };

      await medplum.updateResource(updatedNote);
      await fetchNotes();

      notifications.show({
        title: 'Success',
        message: 'Note updated successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Error updating note:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to update note',
        color: 'red'
      });
      throw err;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await medplum.deleteResource('Composition', id);
      await fetchNotes();

      notifications.show({
        title: 'Success',
        message: 'Note deleted successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Error deleting note:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete note',
        color: 'red'
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetchNotes: fetchNotes
  };
} 
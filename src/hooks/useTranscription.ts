import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition, CompositionSection, Patient, Practitioner } from '@medplum/fhirtypes';
import { NoteTemplate } from '../components/templates/types';
import { useNoteTemplate } from './useNoteTemplate';
import { BotService } from '../services/BotService';
import { useOrganizationUsage } from './useOrganizationUsage';
import { useMedplumProfile } from '@medplum/react';

interface UseTranscriptionReturn {
  transcript: string;
  psychNote: {
    content: string;
    prompt?: string;
    rawResponse?: string;
  };
  status: string;
  transcribeAudio: (audioBlob: Blob, compositionId: string, onStart?: (time: string) => void) => Promise<string>;
  generateNote: (
    transcript: string,
    selectedPatient: Patient | undefined,
    selectedTemplate: NoteTemplate | undefined,
    compositionId: string
  ) => Promise<void>;
  setPsychNote: (note: { content: string; prompt?: string; rawResponse?: string }) => void;
}

interface NoteSection {
  title: string;
  content: string;
}

interface NoteResponse {
  sections: NoteSection[];
}

export function useTranscription(): UseTranscriptionReturn {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const botService = new BotService(medplum);
  const { generatePrompt } = useNoteTemplate();
  const { incrementUsage } = useOrganizationUsage();
  const [transcript, setTranscript] = useState<string>('');
  const [psychNote, setPsychNote] = useState<{ content: string; prompt?: string; rawResponse?: string }>({ content: '' });
  const [status, setStatus] = useState('Ready');

  // Add type guard
  function isPractitioner(profile: any): profile is Practitioner {
    return profile?.resourceType === 'Practitioner';
  }

  const transcribeAudio = async (audioBlob: Blob, compositionId: string, onStart?: (time: string) => void): Promise<string> => {
    console.log('transcribeAudio called with blob size:', audioBlob.size);
    console.log('compositionId:', compositionId);
    
    if (!audioBlob || !compositionId) {
      console.log('Missing required data:', { 
        hasAudioBlob: !!audioBlob, 
        hasCompositionId: !!compositionId 
      });
      throw new Error('Missing required data for transcription');
    }

    try {
      const composition = await medplum.readResource('Composition', compositionId);
      console.log('Retrieved composition:', composition);

      const now = new Date();
      const timeString = now.toLocaleString();
      onStart?.(timeString);
      
      setStatus('Processing audio...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      console.log('Audio data prepared, size:', audioData.length);
      
      setStatus('Transcribing...');
      const transcriptText = await botService.transcribeAudio(audioData, audioBlob.type);
      console.log('Transcript received, length:', transcriptText.length);
      
      setTranscript(transcriptText);

      // Update composition with transcript
      const updatedComposition: Composition = {
        ...composition,
        section: [
          ...(composition.section || []).filter(s => s.title !== 'Transcript'),
          {
            title: 'Transcript',
            text: {
              status: 'generated',
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${transcriptText}</div>`
            }
          }
        ]
      };

      await medplum.updateResource(updatedComposition);
      setStatus('Transcription complete');
      return transcriptText;
    } catch (err) {
      console.error('Detailed transcription error:', err);
      setStatus('Error: Transcription failed');
      throw err;
    }
  };

  function convertToFHIR(noteContent: NoteResponse, template?: NoteTemplate): CompositionSection[] {
    return noteContent.sections.map((section) => ({
      title: section.title,
      text: {
        status: 'generated' as const,
        div: `<div xmlns="http://www.w3.org/1999/xhtml" style="white-space: pre-wrap;">${
          // Normalize multiple newlines to just two
          section.content
            .replace(/\\n\\n\\n+/g, '\n\n')  // Replace 3+ newlines with 2
            .replace(/\\n/g, '\n')           // Replace remaining \n with actual newlines
            .replace(/\n\n\n+/g, '\n\n')     // Clean up any resulting 3+ newlines
            .trim()
        }</div>`
      }
    }));
  }

  const processResponse = (response: string | NoteResponse): NoteResponse => {
    let noteContent: NoteResponse;

    if (typeof response === 'string') {
      try {
        // Simple JSON parse with minimal cleaning
        const jsonStr = response.trim();
        noteContent = JSON.parse(jsonStr) as NoteResponse;
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error('Invalid JSON response');
      }
    } else {
      noteContent = response;
    }

    // Basic validation
    if (!noteContent.sections?.length) {
      throw new Error('Response missing sections array');
    }

    return noteContent;
  };

  const generateNote = async (
    transcript: string,
    selectedPatient: Patient | undefined,
    selectedTemplate: NoteTemplate | undefined,
    compositionId: string
  ): Promise<void> => {
    console.log('generateNote called with:', {
      transcriptLength: transcript?.length,
      patientId: selectedPatient?.id,
      templateId: selectedTemplate?.id,
      compositionId
    });

    if (!transcript || !compositionId) {
      console.log('Missing required data:', { hasTranscript: !!transcript, hasCompositionId: !!compositionId });
      return;
    }
    
    setStatus('Initiating note generation...');
    
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      console.log('Retrieved composition for update:', composition);
      
      if (!profile || !isPractitioner(profile)) {
        throw new Error('Invalid profile type');
      }
      
      const prompt = generatePrompt(transcript, selectedPatient, selectedTemplate, profile);
      console.log('Generated prompt:', prompt);
      
      const response = await botService.generateNote(prompt);
      console.log('Raw bot response:', response);
      
      const noteContent = processResponse(response);
      console.log('Processed note content:', noteContent);
      
      const sections = convertToFHIR(noteContent, selectedTemplate);
      console.log('Converted FHIR sections:', sections);

      const updatedComposition: Composition = {
        ...composition,
        section: [
          ...sections,
          ...(composition.section || []).filter(s => s.title === 'Transcript')
        ]
      };
      console.log('About to update composition with:', updatedComposition);

      const savedComposition = await medplum.updateResource(updatedComposition);
      console.log('Composition updated successfully:', savedComposition);
      
      // Format for display
      const formattedContent = noteContent.sections
        .map(section => `${section.title}:\n${section.content.replace(/\\n/g, '\n')}`)
        .join('\n\n');

      setPsychNote({
        content: formattedContent,
        prompt,
        rawResponse: typeof response === 'string' ? response : JSON.stringify(response, null, 2)
      });

      await incrementUsage();
      
      setStatus('Note generated and saved');
    } catch (err) {
      console.error('Detailed error in generateNote:', err);
      throw err;
    }
  };

  return {
    transcript,
    psychNote,
    status,
    transcribeAudio,
    generateNote,
    setPsychNote
  };
}

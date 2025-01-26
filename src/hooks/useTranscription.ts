import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition, Patient, Practitioner } from '@medplum/fhirtypes';
import { NoteTemplate } from '../components/templates/types';
import { useNoteTemplate } from './useNoteTemplate';
import { BotService } from '../services/BotService';

interface UseTranscriptionReturn {
  transcript: string;
  psychNote: string;
  status: string;
  transcribeAudio: (audioBlob: Blob, compositionId: string, onStart?: (time: string) => void) => Promise<void>;
  generateNote: (
    transcript: string,
    selectedPatient: Patient | undefined,
    selectedTemplate: NoteTemplate | undefined,
    compositionId: string
  ) => Promise<void>;
}

interface NoteSection {
  title: string;
  content: string;
}

interface NoteContent {
  sections: NoteSection[];
}

export function useTranscription(): UseTranscriptionReturn {
  const medplum = useMedplum();
  const botService = new BotService(medplum);
  const { generatePrompt } = useNoteTemplate();
  const [transcript, setTranscript] = useState<string>('');
  const [psychNote, setPsychNote] = useState<string>('');
  const [status, setStatus] = useState('Ready');

  const transcribeAudio = async (audioBlob: Blob, compositionId: string, onStart?: (time: string) => void): Promise<void> => {
    console.log('transcribeAudio called with blob size:', audioBlob.size);
    console.log('compositionId:', compositionId);
    
    if (!audioBlob || !compositionId) {
      console.log('Missing required data:', { 
        hasAudioBlob: !!audioBlob, 
        hasCompositionId: !!compositionId 
      });
      return;
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
    } catch (err) {
      console.error('Detailed transcription error:', err);
      setStatus('Error: Transcription failed');

      // Add dummy transcript if needed
      const dummyTranscript = "This is where the transcription would go";
      try {
        const composition = await medplum.readResource('Composition', compositionId);
        const updatedComposition: Composition = {
          ...composition,
          section: [
            ...(composition.section || []).filter(s => s.title !== 'Transcript'),
            {
              title: 'Transcript',
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${dummyTranscript}</div>`
              }
            }
          ]
        };
        await medplum.updateResource(updatedComposition);
        setTranscript(dummyTranscript);
        setStatus('Dummy transcript added');
      } catch (updateErr) {
        console.error('Error adding dummy transcript:', updateErr);
      }
    }
  };

  const generateNote = async (
    transcript: string,
    selectedPatient: Patient | undefined,
    selectedTemplate: NoteTemplate | undefined,
    compositionId: string
  ): Promise<void> => {
    if (!transcript || !compositionId) return;
    
    setStatus('Initiating note generation...');
    
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      const practitioner = await medplum.readResource('Practitioner', composition.author?.[0]?.reference?.split('/')[1] || '');
      
      const prompt = generatePrompt(transcript, selectedPatient, selectedTemplate, practitioner);
      const noteContent = await botService.generateNote(prompt);

      setPsychNote(noteContent.sections.map((section: NoteSection) => 
        `${section.title}:\n${section.content}`
      ).join('\n\n'));

      // Update the composition with the generated note
      const updatedComposition: Composition = {
        ...composition,
        section: [
          ...noteContent.sections.map((section: NoteSection) => ({
            title: section.title,
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.content}</div>`
            }
          })),
          // Preserve transcript section if it exists
          ...(composition.section || []).filter(s => s.title === 'Transcript')
        ]
      };

      await medplum.updateResource(updatedComposition);
      setStatus('Note generated and saved');
      
    } catch (err) {
      console.error('Error generating note:', err);
      setStatus(`Error: Could not generate note - ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };

  return {
    transcript,
    psychNote,
    status,
    transcribeAudio,
    generateNote
  };
}

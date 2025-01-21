import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Composition } from '@medplum/fhirtypes';
import { useActiveComposition } from './useActiveComposition';

interface UseTranscriptionReturn {
  transcript: string;
  psychNote: string;
  status: string;
  savedComposition: Composition | undefined;
  transcribeAudio: (audioBlob: Blob) => Promise<void>;
  generateNote: () => Promise<void>;
}

export function useTranscription(onTranscriptionStart?: (time: string) => void): UseTranscriptionReturn {
  const medplum = useMedplum();
  const [transcript, setTranscript] = useState<string>('');
  const [psychNote, setPsychNote] = useState<string>('');
  const [status, setStatus] = useState('Ready');
  const { savedComposition, updateCompositionSections } = useActiveComposition();

  const transcribeAudio = async (audioBlob: Blob): Promise<void> => {
    // ... existing transcribeAudio implementation ...
  };

  const generateNote = async (): Promise<void> => {
    // ... existing generateNote implementation ...
  };

  return {
    transcript,
    psychNote,
    status,
    savedComposition,
    transcribeAudio,
    generateNote
  };
}

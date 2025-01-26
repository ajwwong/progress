import { Box, Button, Container, Group, Text, Title, Modal, TextInput, Stack, ActionIcon, Paper, Divider, SegmentedControl, Select } from '@mantine/core';
import { IconPlayerRecord, IconPlayerStop, IconPlayerPlay, IconFileText, IconNotes, IconPlayerPause, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { useMedplum, AsyncAutocomplete, ResourceAvatar } from '@medplum/react';
import { Composition, Patient, Practitioner } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { showNotification } from '@mantine/notifications';
import { PatientSelector } from '../components/shared/PatientSelector';
import { AudioControls } from '../components/audio/AudioControls';
import { TranscriptionView } from '../components/audio/TranscriptionView';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useTranscription } from '../hooks/useTranscription';
import { useActiveComposition } from '../hooks/useActiveComposition';
import { useTemplates } from '../components/templates/hooks/useTemplates';
import { NoteTemplate } from '../components/templates/types';

interface AudioTranscribePageProps {
  onTranscriptionStart?: (time: string) => void;
  onCompositionSaved?: () => void;
}

export function AudioTranscribePage({ onTranscriptionStart, onCompositionSaved }: AudioTranscribePageProps): JSX.Element {
  const medplum = useMedplum();
  const { templates } = useTemplates();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [status, setStatus] = useState('Ready');
  const [psychNote, setPsychNote] = useState<string>('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [savedComposition, setSavedComposition] = useState<Composition>();
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);
  const [isTelehealth, setIsTelehealth] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | undefined>(undefined);

  // Set initial values from location state
  useEffect(() => {
    if (location.state?.selectedPatient) {
      setSelectedPatient(location.state.selectedPatient);
    }
  }, [location.state]);

  // Load patient's default template when patient is selected or changes
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      console.log('Loading default template. Patient:', selectedPatient?.id);
      console.log('Templates available:', templates.length);
      
      if (selectedPatient && selectedPatient.id && templates.length > 0) {
        try {
          // Get patient's documentation preferences
          const patientResource = await medplum.readResource('Patient', selectedPatient.id);
          console.log('Patient resource loaded:', patientResource);
          
          const defaultTemplateId = patientResource.extension?.find(
            ext => ext.url === 'http://example.com/fhir/StructureDefinition/default-template'
          )?.valueString;
          
          console.log('Found default template ID:', defaultTemplateId);

          if (defaultTemplateId) {
            const template = templates.find(t => t.id === defaultTemplateId);
            console.log('Matching template found:', template?.name);
            setSelectedTemplate(template);
          }
        } catch (err) {
          console.error('Error loading patient default template:', err);
        }
      }
    };

    loadDefaultTemplate();
  }, [selectedPatient, templates, medplum]);

  // Update selectedTemplate when templates load and we have a default template from navigation
  useEffect(() => {
    const defaultTemplateId = location.state?.defaultTemplate;
    if (defaultTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === defaultTemplateId);
      setSelectedTemplate(template);
    }
  }, [location.state, templates]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    if (!selectedPatient) {
      setStatus('Please select a patient before recording');
      return;
    }

    try {
      setStatus('Starting recording...');
      
      let audioStream: MediaStream;
      
      if (isTelehealth) {
        try {
          // First get microphone audio to ensure we have it
          const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          // Then try to get system audio
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: {
              displaySurface: "browser"
            },
            audio: {
              autoGainControl: false,
              echoCancellation: false,
              noiseSuppression: false,
            }
          });

          // Create a new audio context
          const audioContext = new AudioContext();
          
          // Create sources for both streams
          const micSource = audioContext.createMediaStreamSource(micStream);
          const sysSource = audioContext.createMediaStreamSource(displayStream);
          
          // Create a merger to combine both audio streams
          const merger = audioContext.createChannelMerger(2);
          
          // Connect both sources to the merger
          micSource.connect(merger, 0, 0);
          sysSource.connect(merger, 0, 1);
          
          // Create a destination to get the combined stream
          const dest = audioContext.createMediaStreamDestination();
          merger.connect(dest);
          
          // Create the final combined stream
          audioStream = dest.stream;
          
          // Clean up video tracks
          displayStream.getVideoTracks().forEach(track => track.stop());
          
          // Add cleanup function
          const cleanup = () => {
            audioContext.close();
            displayStream.getTracks().forEach(track => track.stop());
            micStream.getTracks().forEach(track => track.stop());
          };
          
          // Add cleanup to window unload
          window.addEventListener('beforeunload', cleanup);
          
        } catch (err) {
          console.warn('Failed to capture system audio, falling back to microphone only:', err);
          showNotification({
            title: 'System Audio Capture Failed',
            message: 'Recording with microphone only. Make sure you have granted necessary permissions.',
            color: 'yellow'
          });
          
          // Fallback to microphone only
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });
        }
      } else {
        // For in-person, just capture microphone with enhanced settings
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      }

      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        throw new Error('No audio input detected');
      }

      mediaRecorder.current = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      chunksRef.current = [];

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
          reference: `Patient/${selectedPatient.id}`,
          display: getDisplayString(selectedPatient)
        },
        section: [],
        extension: selectedTemplate ? [
          {
            url: 'http://example.com/fhir/StructureDefinition/note-template',
            valueString: selectedTemplate.id
          }
        ] : undefined
      };

      const savedComp = await medplum.createResource(initialComposition);
      setSavedComposition(savedComp as Composition);
      onCompositionSaved?.();

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('Recording saved');
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      const error = err as Error;
      console.error('Error starting recording:', error);
      setStatus('Error: Could not start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const playAudio = async () => {
    if (!audioBlob) return;
    try {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => URL.revokeObjectURL(audio.src);
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setStatus('Error: Could not play audio');
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob || !savedComposition) return;
    try {
      const now = new Date();
      const timeString = now.toLocaleString();
      onTranscriptionStart?.(timeString);
      
      setStatus('Processing audio...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      
      setStatus('Uploading to server...');
      const binary = await medplum.createBinary({
        data: audioData,
        contentType: audioBlob.type
      });
      
      setStatus('Transcribing...');
      const response = await medplum.executeBot(
        '1255675e-266d-4ab9-bc69-a850c6ca4875',
        {
          type: 'audio',
          binaryId: binary.id
        },
        'application/json'
      );

      if (response.details?.transcript) {
        setTranscript(response.details.transcript);
        
        const updatedComposition: Composition = {
          ...savedComposition,
          section: [
            ...(savedComposition.section || []),
            {
              title: 'Transcript',
              text: {
                status: 'generated' as const,
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${response.details.transcript}</div>`
              }
            }
          ]
        };

        const updated = await medplum.updateResource(updatedComposition);
        setSavedComposition(updated as Composition);
        setStatus('Transcription complete');
      } else {
        setStatus('Error: No transcript received');
      }
    } catch (err) {
      console.error('Error transcribing:', err);
      setStatus('Error: Transcription failed');

      // Update the composition with a dummy transcript
      if (savedComposition) {
        const dummyTranscript = "This is where the transcription would go";
        const updatedComposition: Composition = {
          ...savedComposition,
          section: [{
            title: 'Transcript',
            text: {
              status: 'generated' as const,
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${dummyTranscript}</div>`
            }
          }]
        };

        try {
          const updated = await medplum.updateResource(updatedComposition);
          setSavedComposition(updated as Composition);
          setTranscript(dummyTranscript);
          setStatus('Dummy transcript added');
        } catch (updateErr) {
          const error = updateErr as Error;
          console.error('Error updating composition with dummy transcript:', error);
        }
      }
    }
  };

  const generateNote = async () => {
    if (!transcript || !savedComposition) return;
    
    setStatus('Initiating note generation...');
    
    try {
      // Get practitioner preferences
      const practitioner = await medplum.readResource('Practitioner', savedComposition.author?.[0]?.reference?.split('/')[1] || '');
      
      // Get preferences from practitioner extensions
      const referencePreference = practitioner.extension?.find(e => 
        e.url === 'https://progress.care/fhir/reference-preference'
      )?.valueString || 'patient';
      
      const quotePreference = practitioner.extension?.find(e => 
        e.url === 'https://progress.care/fhir/quote-preference'
      )?.valueString || 'exclude';
      
      // Get selected interventions
      let interventions: string[] = [];
      const interventionsExt = practitioner.extension?.find(e => 
        e.url === 'https://progress.care/fhir/interventions'
      );
      if (interventionsExt?.valueString) {
        interventions = JSON.parse(interventionsExt.valueString);
      }

      // Create therapeutic approach text
      const therapeuticApproach = interventions.length > 0 
        ? `utilizing ${interventions.length === 1 
            ? interventions[0] 
            : interventions.slice(0, -1).join(', ') + ' and ' + interventions[interventions.length - 1]}`
        : 'using an integrative therapeutic approach';

      // Get patient's name if needed
      let patientNameInfo = '';
      if (referencePreference === 'name' && selectedPatient?.name?.[0]) {
        const firstName = selectedPatient.name[0].given?.[0] || '';
        if (firstName) {
          patientNameInfo = `\nPatient's first name: ${firstName}\n`;
        }
      }

      // Create template-specific instructions
      let templateInstructions = '';
      if (selectedTemplate) {
        templateInstructions = `
You MUST return your response as a valid JSON object, with no additional text before or after. The response must follow this exact format as based on this sample note:

{
  "sections": [
${selectedTemplate.sections.map(section => `    {
      "title": "${section.title}",
      "content": "${section.sampleContent || `[Your detailed content for ${section.title}]`}"
    }`).join(',\n')}
  ]
}

Important JSON formatting rules:
1. Use double quotes for all strings
2. Escape any quotes within content using backslash
3. Use \\n for line breaks
4. Do not include any text outside the JSON object
5. Each section must have exactly these fields: "title" and "content"`;
      } else {
        templateInstructions = `
IMPORTANT: You MUST provide a COMPLETE response. Do not truncate or abbreviate any section.
You MUST return your response as a valid JSON object, with no additional text before or after. 
The response must follow this exact format:

{
  "sections": [
    {
      "title": "Subjective & History",
      "content": "[Your detailed subjective content - COMPLETE, not truncated]"
    },
    {
      "title": "Mental Status Exam",
      "content": "[Your detailed MSE content - COMPLETE, not truncated]"
    },
    {
      "title": "Assessment & Plan",
      "content": "[Your detailed assessment and plan - COMPLETE, not truncated]"
    }
  ]
}

Important JSON formatting rules:
1. Use double quotes for all strings
2. Escape any quotes within content using backslash
3. Use \\n for line breaks
4. Do not include any text outside the JSON object
5. Each section must have exactly these fields: "title" and "content"
6. DO NOT truncate or abbreviate any section content
7. Ensure your response includes ALL content for each section`;
      }

      // Create the prompt for the psychotherapy note
      const prompt = `As an experienced clinical psychologist or psychotherapist ${therapeuticApproach}, create a comprehensive and clinically precise psychotherapy progress note based on the following therapy session transcript. Your note should reflect deep clinical expertise, demonstrate thorough assessment and therapeutic insight, and adhere to professional documentation standards.${patientNameInfo}

IMPORTANT RESPONSE REQUIREMENTS:
1. You MUST provide a COMPLETE response for each section
2. DO NOT truncate or abbreviate any section
3. Include ALL relevant clinical information
4. Ensure each section is fully detailed and complete

Important Documentation Requirements:
1. Use clear, objective, and professional language
2. Include relevant clinical observations and specific examples
3. Document risk assessment when applicable
4. Note any changes in symptoms or functioning
5. Record therapeutic interventions used and their effectiveness
6. Include plan for next session 

Style and Format Preferences:
- When referring to the person being supported, use "${referencePreference === 'name' ? 'their name' : referencePreference}"
- ${quotePreference === 'include' ? 'Organically and seamlessly include brief relevant quotes from the session when appropriate to support clinical observations' : 'Do not include direct quotes from the session'}
- Use specific, behavioral descriptions rather than general statements
- Include clinical reasoning for interventions and recommendations
- Please use the following sample note as a reference for the exact format we will be using for the note:

${templateInstructions}

Please ensure each section is thorough, clinically relevant, and provides sufficient detail for continuity of care. The note should clearly document the session's clinical significance and support treatment planning.

IMPORTANT: Your response MUST be complete and include ALL content for each section. Do not truncate or abbreviate any section.

Transcript:
${transcript}`;

      console.log('Prompt being sent to Claude:', prompt);

      // Call the bot with the prompt and handle streaming response
      const botResponse = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        {
          prompt: prompt,
          stream: true, // Enable streaming if supported
          maxTokens: 4000, // Request larger response
          options: {
            responseFormat: {
              type: "json"
            },
            temperature: 0.1, // Lower temperature for more consistent responses
          }
        },
        'application/json'
      );

      // Log response details
      console.log('Bot response type:', typeof botResponse);
      console.log('Bot response length:', typeof botResponse === 'string' 
        ? botResponse.length 
        : JSON.stringify(botResponse).length
      );
      
      if (!botResponse) {
        throw new Error('No response received from the bot');
      }

      // Parse the JSON response
      let noteContent;
      try {
        const responseText = typeof botResponse === 'string' 
          ? botResponse 
          : botResponse.text || botResponse.content?.[0]?.text;

        if (!responseText) {
          throw new Error('Empty response from bot');
        }

        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        // Clean the JSON string
        const cleanJson = jsonMatch[0]
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\\[rn]/g, '\\n')                     // Normalize line endings
          .replace(/\s+/g, ' ');                         // Normalize whitespace

        console.log('Cleaned JSON:', cleanJson);
        
        try {
          noteContent = JSON.parse(cleanJson);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          console.log('Raw response:', responseText);
          throw new Error('Failed to parse cleaned JSON');
        }
      } catch (parseErr) {
        console.error('Error parsing bot response:', parseErr);
        // Try to salvage the response by creating a basic structure
        if (typeof botResponse === 'string' || botResponse.text) {
          const text = (typeof botResponse === 'string' ? botResponse : botResponse.text) || '';
          noteContent = {
            sections: [
              {
                title: 'Progress Note',
                content: text
              }
            ]
          };
        } else {
          throw new Error('Invalid response format from bot. Expected JSON.');
        }
      }

      if (!noteContent?.sections) {
        throw new Error('Invalid note format: missing sections array');
      }

      setPsychNote(noteContent.sections.map((section: { title: string, content: string }) => 
        `${section.title}:\n${section.content}`
      ).join('\n\n'));  // Keep a formatted version for the UI

      // Update the composition with the generated note
      try {
        const compositionSections = noteContent.sections.map((section: { title: string, content: string }) => ({
          title: section.title,
          text: {
            status: 'generated' as const,
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.content}</div>`
          }
        }));

        // Create the updated composition
        const updatedComposition = {
          ...savedComposition,
          extension: [
            ...(savedComposition.extension || []),
            {
              url: 'https://progress.care/fhir/note-template',
              valueString: selectedTemplate 
                ? `${selectedTemplate.name} (ID: ${selectedTemplate.id})` 
                : 'Default Template'
            }
          ],
          section: [
            ...compositionSections,
            // Add transcript section at the end
            {
              title: 'Transcript',
              text: {
                status: 'generated' as const,
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${transcript}</p></div>`
              }
            }
          ]
        };

        await medplum.updateResource(updatedComposition);
        
        showNotification({
          title: 'Note Generated',
          message: 'The note has been generated and saved successfully.',
          color: 'green'
        });
        
        setStatus('Note generated and saved');
      } catch (updateErr) {
        console.error('Error updating composition:', updateErr);
        showNotification({
          title: 'Warning',
          message: 'Note was generated but could not be saved automatically.',
          color: 'yellow'
        });
      }
      
    } catch (err) {
      const error = err as Error;
      console.error('Error generating note:', error);
      setStatus(`Error: Could not generate note - ${error.message}`);
      
      showNotification({
        title: 'Error',
        message: 'Failed to generate note',
        color: 'red'
      });
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.resume();
      setIsPaused(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setAudioBlob(null);
      chunksRef.current = [];
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  return (
    <Container size="lg" mt="xl">
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Title order={2}>Audio Session Recorder</Title>
            <Group>
              <Text size="sm" c="dimmed">Session Type:</Text>
              <SegmentedControl
                size="sm"
                data={[
                  { label: 'In-Person', value: 'inPerson' },
                  { label: 'Telehealth', value: 'telehealth' }
                ]}
                value={isTelehealth ? 'telehealth' : 'inPerson'}
                onChange={(value) => setIsTelehealth(value === 'telehealth')}
              />
            </Group>
          </Group>
        
          <Stack gap="lg">
            <Stack gap="md">
              <PatientSelector 
                onSelect={(patient: Patient) => setSelectedPatient(patient)}
                initialPatient={selectedPatient}
                context="audio"
              />
              {selectedPatient && (
                <Stack gap="xs">
                  <Select
                    label="Note Template"
                    placeholder="Select a template"
                    data={templates
                      .filter(t => t.type === 'progress')
                      .map(t => ({
                        value: t.id!,
                        label: t.name
                      }))}
                    value={selectedTemplate?.id}
                    onChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template);
                    }}
                    style={{ maxWidth: '400px' }}
                  />
                </Stack>
              )}
            </Stack>
            
            <AudioControls
              isRecording={isRecording}
              isPaused={isPaused}
              isBlinking={isBlinking}
              hasTranscript={!!transcript}
              hasAudioBlob={!!audioBlob}
              status={status}
              disabled={!selectedPatient}
              onStart={startRecording}
              onStop={stopRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onCancel={cancelRecording}
              onPlay={playAudio}
              onTranscribe={transcribeAudio}
              onGenerateNote={generateNote}
            />

            <TranscriptionView 
              transcript={transcript}
              psychNote={psychNote}
            />
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
import { AppShell, ErrorBoundary, Loading, Logo, useMedplum, useMedplumProfile } from '@medplum/react';
import { IconUser, IconMicrophone, IconCalendar, IconFileText, IconTemplate, IconSettings, IconAlertTriangle, IconMailOpened } from '@tabler/icons-react';
import { Suspense, useState, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { PatientHistory } from './components/PatientHistory';
import { PatientOverview } from './components/PatientOverview';
import { Timeline } from './components/Timeline';
import { SessionNotes } from './components/SessionNotes';
import { TreatmentPlan } from './components/TreatmentPlan';
import { PatientProfile } from './components/PatientProfile';
import { NoteTemplatesPage } from './components/templates/NoteTemplatesPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { PatientPage } from './pages/PatientPage';
import { ResourcePage } from './pages/ResourcePage';
import { SignInPage } from './pages/SignInPage';
import { AudioTranscribePage } from './pages/AudioTranscribePage';
import { useCompositions } from './hooks/useCompositions';
import { NoteView } from './pages/NoteView';
import { PatientAutocompletePage } from './pages/PatientAutocomplete';
import { RegisterPage } from './pages/RegisterPage';
import { CalendarPage } from './pages/CalendarPage';
import { createContext } from 'react';
import { PatientDirectoryPage } from './features/patients/pages/PatientDirectoryPage';
import { ClientRoutes } from './routes/ClientRoutes';
import { StripeConnect } from './pages/provider/StripeConnect';
import { BillingDashboard } from './pages/provider/BillingDashboard';
import { PractitionerPage } from './pages/PractitionerPage';
import { PatientRecentComposition } from './components/PatientRecentComposition';
import { TemplateRoutes } from './components/templates/TemplateRoutes';
import { Box, Button, Text, Stack, Loader, Group } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

export const CalendarContext = createContext<{
  showNewAppointmentModal: boolean;
  setShowNewAppointmentModal: (show: boolean) => void;
}>({
  showNewAppointmentModal: false,
  setShowNewAppointmentModal: () => {},
});

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [transcriptionTimes, setTranscriptionTimes] = useState<string[]>([]);
  const { compositions, isLoading, triggerUpdate } = useCompositions();
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [transcribingCompositionId, setTranscribingCompositionId] = useState<string | null>(null);
  const [generatingCompositionId, setGeneratingCompositionId] = useState<string | null>(null);
  const [localCompositions, setLocalCompositions] = useState<any[]>([]);

  // Initialize localCompositions when compositions load
  useEffect(() => {
    if (compositions) {
      setLocalCompositions(compositions);
    }
  }, [compositions]);

  // Listen for composition updates
  useEffect(() => {
    const handleCompositionViewed = (event: any) => {
      const { composition } = event.detail;
      setLocalCompositions(prev => 
        prev.map(comp => 
          comp.id === composition.id ? composition : comp
        )
      );
    };

    window.addEventListener('composition-viewed', handleCompositionViewed);
    return () => window.removeEventListener('composition-viewed', handleCompositionViewed);
  }, []);

  const isNoteCompleted = (composition: any) => {
    return composition.extension?.some((ext: any) => 
      ext.url === 'http://example.com/fhir/StructureDefinition/note-generation-complete' && 
      ext.valueBoolean === true
    );
  };

  const getProcessingStatus = (composition: any) => {
    const ext = composition.extension?.find((ext: any) => 
      ext.url === 'http://example.com/fhir/StructureDefinition/note-processing-status'
    );
    return ext?.valueString || 'idle';
  };

  const isActivelyProcessing = (composition: any) => {
    const status = getProcessingStatus(composition);
    // Only show spinner if the composition is currently being processed in this session
    return (status === 'transcribing' && transcribingCompositionId === composition.id) || 
           (status === 'generating' && generatingCompositionId === composition.id);
  };

  const wasInterrupted = (composition: any) => {
    const status = getProcessingStatus(composition);
    // Show interrupted state if it's marked as processing but not in current session
    return (status === 'transcribing' || status === 'generating') && 
           !isActivelyProcessing(composition);
  };

  const isViewed = (composition: any) => {
    return composition.extension?.some((ext: any) => 
      ext.url === 'http://example.com/fhir/StructureDefinition/note-viewed' && 
      ext.valueBoolean === true
    );
  };

  const handleTranscriptionStart = async (compositionId: string) => {
    setTranscribingCompositionId(compositionId);
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      const extensions = composition.extension || [];
      const existingIndex = extensions.findIndex(ext => 
        ext.url === 'http://example.com/fhir/StructureDefinition/note-processing-status'
      );
      
      if (existingIndex >= 0) {
        extensions[existingIndex].valueString = 'transcribing';
      } else {
        extensions.push({
          url: 'http://example.com/fhir/StructureDefinition/note-processing-status',
          valueString: 'transcribing'
        });
      }
      
      await medplum.updateResource({
        ...composition,
        extension: extensions
      });
      triggerUpdate();
    } catch (err) {
      console.error('Error updating transcription status:', err);
    }
  };

  const handleTranscriptionEnd = async () => {
    if (transcribingCompositionId) {
      try {
        const composition = await medplum.readResource('Composition', transcribingCompositionId);
        const extensions = composition.extension || [];
        const existingIndex = extensions.findIndex(ext => 
          ext.url === 'http://example.com/fhir/StructureDefinition/note-processing-status'
        );
        
        if (existingIndex >= 0) {
          extensions[existingIndex].valueString = 'idle';
        }
        
        await medplum.updateResource({
          ...composition,
          extension: extensions
        });
        triggerUpdate();
      } catch (err) {
        console.error('Error updating transcription status:', err);
      }
    }
    setTranscribingCompositionId(null);
  };

  const handleGeneratingStart = async (compositionId: string) => {
    setGeneratingCompositionId(compositionId);
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      const extensions = composition.extension || [];
      const existingIndex = extensions.findIndex(ext => 
        ext.url === 'http://example.com/fhir/StructureDefinition/note-processing-status'
      );
      
      if (existingIndex >= 0) {
        extensions[existingIndex].valueString = 'generating';
      } else {
        extensions.push({
          url: 'http://example.com/fhir/StructureDefinition/note-processing-status',
          valueString: 'generating'
        });
      }
      
      await medplum.updateResource({
        ...composition,
        extension: extensions
      });
      triggerUpdate();
    } catch (err) {
      console.error('Error updating generation status:', err);
    }
  };

  const handleGeneratingEnd = async (compositionId: string) => {
    setGeneratingCompositionId(null);
    
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      const extensions = composition.extension || [];
      
      // Update processing status to idle
      const processingIndex = extensions.findIndex(ext => 
        ext.url === 'http://example.com/fhir/StructureDefinition/note-processing-status'
      );
      if (processingIndex >= 0) {
        extensions[processingIndex].valueString = 'idle';
      }
      
      // Set completion status to true
      const completionIndex = extensions.findIndex(ext => 
        ext.url === 'http://example.com/fhir/StructureDefinition/note-generation-complete'
      );
      if (completionIndex >= 0) {
        extensions[completionIndex].valueBoolean = true;
      } else {
        extensions.push({
          url: 'http://example.com/fhir/StructureDefinition/note-generation-complete',
          valueBoolean: true
        });
      }
      
      await medplum.updateResource({
        ...composition,
        extension: extensions
      });
      triggerUpdate();
    } catch (err) {
      console.error('Error updating completion status:', err);
    }
  };

  const handleCompositionClick = async (e: React.MouseEvent, compositionId: string) => {
    e.preventDefault();
    
    try {
      const composition = await medplum.readResource('Composition', compositionId);
      const extensions = composition.extension || [];
      const existingIndex = extensions.findIndex(ext => 
        ext.url === 'http://example.com/fhir/StructureDefinition/note-viewed'
      );
      
      if (existingIndex >= 0) {
        extensions[existingIndex].valueBoolean = true;
      } else {
        extensions.push({
          url: 'http://example.com/fhir/StructureDefinition/note-viewed',
          valueBoolean: true
        });
      }
      
      await medplum.updateResource({
        ...composition,
        extension: extensions
      });
      triggerUpdate();
      
      // Now navigate
      window.location.href = `/composition/${compositionId}`;
    } catch (err) {
      console.error('Error updating viewed status:', err);
      // Still navigate even if the update fails
      window.location.href = `/composition/${compositionId}`;
    }
  };

  if (medplum.isLoading()) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Notifications position="top-right" />
      <CalendarContext.Provider value={{ showNewAppointmentModal, setShowNewAppointmentModal }}>
        <AppShell
          logo={<Logo size={24} />}
          menus={[
            {
              title: 'My Links',
              links: [
                { icon: <IconCalendar />, label: 'Calendar', href: '/calendar' },
                { icon: <IconUser />, label: 'Patients', href: '/patient' },
                { icon: <IconMicrophone />, label: 'Audio Transcribe', href: '/audio' },
                { icon: <IconTemplate />, label: 'Note Templates', href: '/templates' },
                { icon: <IconSettings />, label: 'Settings', href: '/settings' }
              ],
            },
            {
              title: 'Recent Compositions',
              links: isLoading ? [] : localCompositions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 12)
                .map(comp => ({
                icon: (
                  <div style={{ width: 16, height: 16, position: 'relative', marginRight: 12 }}>
                    {!isActivelyProcessing(comp) && !wasInterrupted(comp) && (
                      isViewed(comp) ? (
                        <IconMailOpened 
                          size={16} 
                          style={{ 
                            position: 'absolute',
                            color: 'var(--mantine-color-gray-5)'
                          }} 
                        />
                      ) : (
                        <IconFileText 
                          size={16} 
                          style={{ 
                            position: 'absolute',
                            color: isNoteCompleted(comp) 
                              ? 'var(--mantine-color-green-6)' 
                              : undefined
                          }} 
                        />
                      )
                    )}
                    {isActivelyProcessing(comp) && (
                      <Loader 
                        size="sm" 
                        color="gray.5" 
                        style={{ 
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }} 
                      />
                    )}
                    {wasInterrupted(comp) && (
                      <IconAlertTriangle
                        size={16}
                        style={{ 
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'var(--mantine-color-yellow-6)'
                        }} 
                      />
                    )}
                  </div>
                ),
                label: (
                  <Group justify="space-between" wrap="nowrap" w="100%" pl={4}>
                    <div style={{ lineHeight: 1.2, flex: 1 }}>
                      <Text 
                        fw={500} 
                        truncate="end" 
                        c={isViewed(comp) ? 'dimmed' : undefined}
                      >
                        {comp.subject?.display || 'Unknown Patient'}
                      </Text>
                      <Text size="xs" c="dimmed">{formatDate(comp.date)}</Text>
                    </div>
                  </Group>
                ),
                href: `/composition/${comp.id}`
              }))
            },
          ]}
        >
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={profile ? <CalendarPage /> : <LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/patient" element={<PatientDirectoryPage />} />
                <Route path="/patient-search-test" element={<PatientAutocompletePage />} />
                <Route path="/audio" element={<AudioTranscribePage 
                  onTranscriptionStart={handleTranscriptionStart}
                  onCompositionSaved={triggerUpdate}
                  onTranscriptionEnd={handleTranscriptionEnd}
                  onGeneratingStart={handleGeneratingStart}
                  onGeneratingEnd={handleGeneratingEnd}
                />} />
                <Route path="/Patient/:id" element={<PatientPage />}>
                  <Route index element={<PatientProfile />} />
                  <Route path="overview" element={<PatientOverview />} />
                  <Route path="timeline" element={<Timeline />} />
                  <Route path="history" element={<PatientHistory />} />
                  <Route path="notes" element={<SessionNotes />} />
                  <Route path="recent" element={<PatientRecentComposition />} />
                  <Route path="treatment" element={<TreatmentPlan />} />
                  <Route path="profile" element={<PatientProfile />} />
                </Route>
                <Route path="/:resourceType/:id" element={<ResourcePage />} />
                <Route path="/:resourceType/:id/_history/:versionId" element={<ResourcePage />} />
                <Route path="/composition/:id" element={<NoteView />} />
                <Route path="/templates/*" element={<TemplateRoutes />} />
                <Route path="/portal/*" element={<ClientRoutes />} />
                <Route path="/billing" element={<BillingDashboard />} />
                <Route path="/settings" element={<PractitionerPage />} />
                <Route path="/Practitioner/:id" element={<PractitionerPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppShell>
      </CalendarContext.Provider>
    </>
  );
}
import { AppShell, ErrorBoundary, Loading, Logo, useMedplum, useMedplumProfile } from '@medplum/react';
import { IconUser, IconMicrophone, IconFileText } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PatientHistory } from './components/PatientHistory';
import { PatientOverview } from './components/PatientOverview';
import { Timeline } from './components/Timeline';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { PatientPage } from './pages/PatientPage';
import { ResourcePage } from './pages/ResourcePage';
import { SignInPage } from './pages/SignInPage';
import { AudioTranscribePage } from './pages/AudioTranscribePage';
import { useCompositions } from './hooks/useCompositions';
import { NoteView } from './pages/NoteView';
import { PatientAutocompletePage } from './pages/PatientAutocomplete';

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [transcriptionTimes, setTranscriptionTimes] = useState<string[]>([]);
  const { compositions, isLoading, triggerUpdate } = useCompositions();

  const addTranscriptionTime = (time: string) => {
    setTranscriptionTimes(prev => [...prev, time]);
  };

  if (medplum.isLoading()) {
    return null;
  }

  return (
    <AppShell
      logo={<Logo size={24} />}
      menus={[
        {
          title: 'My Links',
          links: [
            { icon: <IconUser />, label: 'Patients', href: '/' },
            { icon: <IconMicrophone />, label: 'Audio Transcribe', href: '/transcribe' },
          ],
        },
        {
          title: 'Recent Compositions',
          links: isLoading ? [] : compositions.map((comp) => {
            const date = new Date(comp.date);
            const formattedDate = date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
            return {
              icon: <IconFileText size={16} />,
              label: `${comp.subject?.display || 'Unknown'} - ${formattedDate}`,
              href: `/composition/${comp.id}`,
            };
          }),
        },
      ]}
    >
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={profile ? <HomePage /> : <LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/patient-search-test" element={<PatientAutocompletePage />} />
            <Route path="/transcribe" element={<AudioTranscribePage onTranscriptionStart={addTranscriptionTime} onCompositionSaved={triggerUpdate} />} />
            <Route path="/Patient/:id" element={<PatientPage />}>
              <Route index element={<PatientOverview />} />
              <Route path="overview" element={<PatientOverview />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="history" element={<PatientHistory />} />
            </Route>
            <Route path="/:resourceType/:id" element={<ResourcePage />} />
            <Route path="/:resourceType/:id/_history/:versionId" element={<ResourcePage />} />
            <Route path="/composition/:id" element={<NoteView />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

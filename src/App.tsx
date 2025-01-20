import { AppShell, ErrorBoundary, Loading, Logo, useMedplum, useMedplumProfile } from '@medplum/react';
import { IconUser, IconMicrophone, IconCalendar, IconFileText, IconTemplate, IconCreditCard, IconSettings } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
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
import { SettingsPage } from './pages/SettingsPage';
import { PractitionerPage } from './pages/PractitionerPage';
import { PatientRecentComposition } from './components/PatientRecentComposition';


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

  const addTranscriptionTime = (time: string) => {
    setTranscriptionTimes(prev => [...prev, time]);
  };

  if (medplum.isLoading()) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    // For other dates
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
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
            links: isLoading ? [] : compositions.map((comp) => {
              const formattedDate = formatDate(comp.date);
              const patientName = comp.subject?.display || 'Unknown Patient';
              return {
                icon: <IconFileText size={16} />,
                label: (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <span style={{ fontWeight: 500 }}>{patientName}</span>
                    <span style={{ 
                      fontSize: '0.75rem',
                      color: 'var(--mantine-color-gray-6)'
                    }}>{formattedDate}</span>
                  </div>
                ),
                href: `/composition/${comp.id}`,
              };
            }),
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
              <Route path="/audio" element={<AudioTranscribePage onTranscriptionStart={addTranscriptionTime} onCompositionSaved={triggerUpdate} />} />
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
              <Route path="/templates" element={<NoteTemplatesPage />} />
              <Route path="/portal/*" element={<ClientRoutes />} />
              <Route path="/billing" element={<BillingDashboard />} />
              <Route path="/settings" element={<PractitionerPage />} />
              <Route path="/Practitioner/:id" element={<PractitionerPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </CalendarContext.Provider>
  );
}
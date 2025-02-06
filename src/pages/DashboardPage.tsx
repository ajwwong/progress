import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { Center, Loader } from '@mantine/core';
import { useMedplum } from '@medplum/react';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const { hasCompletedOnboarding } = useOnboarding();

  useEffect(() => {
    console.log('DashboardPage: Component mounted');
    console.log('DashboardPage: Medplum loading?', medplum.isLoading());
    console.log('DashboardPage: Medplum profile?', !!medplum.getProfile());

    // If not authenticated, redirect to sign in
    if (!medplum.isLoading() && !medplum.getProfile()) {
      console.log('DashboardPage: No profile found, redirecting to signin');
      navigate('/signin');
      return;
    }
  }, [medplum, navigate]);

  useEffect(() => {
    if (medplum.isLoading()) {
      console.log('DashboardPage: Medplum still loading...');
      return;
    }

    console.log('DashboardPage: hasCompletedOnboarding:', hasCompletedOnboarding);
    
    const timer = setTimeout(() => {
      if (hasCompletedOnboarding) {
        console.log('DashboardPage: Redirecting to calendar');
        navigate('/calendar');
      } else {
        console.log('DashboardPage: Redirecting to onboarding');
        navigate('/onboarding');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding, navigate, medplum]);

  return (
    <Center h="100vh">
      <Loader size="xl" />
    </Center>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { Center, Loader } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { OnboardingStep } from '../hooks/onboardingSteps';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const { currentStep } = useOnboarding();

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

    console.log('DashboardPage: Current onboarding step:', currentStep);
    
    // Route based on current onboarding step
    switch (currentStep) {
      case OnboardingStep.NOT_STARTED:
      case OnboardingStep.REGISTERED:
        navigate('/onboarding/organization');
        break;
      case OnboardingStep.ORGANIZATION_SETUP:
        navigate('/onboarding');
        break;
      case OnboardingStep.TRANSCRIPTION_TUTORIAL:
        navigate('/calendar');
        break;
      case OnboardingStep.COMPLETED:
        navigate('/calendar');
        break;
      default:
        console.error('Unknown onboarding step:', currentStep);
        navigate('/onboarding/organization');
    }
  }, [currentStep, navigate, medplum]);

  return (
    <Center h="100vh">
      <Loader size="xl" />
    </Center>
  );
}

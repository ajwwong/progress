import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { Center, Loader } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { OnboardingStep } from '../hooks/onboardingSteps';
import { ProfileResource } from '@medplum/fhirtypes';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const { currentStep, updateOnboardingStep } = useOnboarding();

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

    const profile = medplum.getProfile() as ProfileResource;
    const isPractitioner = profile?.resourceType === 'Practitioner';

    console.log('DashboardPage: Current onboarding step:', currentStep);
    
    // Route based on current onboarding step
    switch (currentStep) {
      case OnboardingStep.NOT_STARTED:
      case OnboardingStep.REGISTERED:
        if (isPractitioner) {
          // If practitioner, update step and go to onboarding
          updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
          navigate('/onboarding');
        } else {
          // If not practitioner (i.e., test patient), go to organization setup
          navigate('/onboarding/organization');
        }
        break;
      case OnboardingStep.ORGANIZATION_SETUP:
        navigate('/onboarding/organization');
        break;
      case OnboardingStep.ORGANIZATION_CREATED:
        navigate('/onboarding/logoff');
        break;
      case OnboardingStep.TRANSCRIPTION_TUTORIAL:
        navigate('/calendar');
        break;
      case OnboardingStep.COMPLETED:
        navigate('/calendar');
        break;
      default:
        console.error('Unknown onboarding step:', currentStep);
        if (isPractitioner) {
          updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
          navigate('/onboarding');
        } else {
          navigate('/onboarding/organization');
        }
    }
  }, [currentStep, navigate, medplum, updateOnboardingStep]);

  return (
    <Center h="100vh">
      <Loader size="xl" />
    </Center>
  );
}

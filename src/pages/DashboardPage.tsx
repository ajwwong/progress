import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { Center, Loader } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { OnboardingStep } from '../hooks/onboardingSteps';
import { Practitioner } from '@medplum/fhirtypes';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const { currentStep, updateOnboardingStep, loading } = useOnboarding();

  useEffect(() => {
    console.log('DashboardPage: Component mounted');
    console.log('DashboardPage: Medplum loading?', medplum.isLoading());
    console.log('DashboardPage: Medplum profile?', !!medplum.getProfile());

    if (!medplum.isLoading() && !medplum.getProfile()) {
      console.log('DashboardPage: No profile found, redirecting to signin');
      navigate('/signin');
      return;
    }
  }, [medplum, navigate]);

  useEffect(() => {
    const handleOnboarding = async () => {
      if (medplum.isLoading() || loading) {
        console.log('DashboardPage: Still loading...');
        return;
      }

      const profile = await medplum.getProfile() as Practitioner;
      const isPractitioner = profile?.resourceType === 'Practitioner';

      console.log('DashboardPage: Current onboarding step:', currentStep);
      
      // Route based on current onboarding step
      switch (currentStep) {
        case OnboardingStep.NOT_STARTED:
        case OnboardingStep.REGISTERED:
          if (isPractitioner) {
            // If practitioner, update step and go to onboarding
            await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
            navigate('/onboarding');
          } else {
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
            await updateOnboardingStep(OnboardingStep.ORGANIZATION_CREATED);
            navigate('/onboarding');
          } else {
            navigate('/onboarding/organization');
          }
      }
    };

    handleOnboarding();
  }, [currentStep, loading, navigate, medplum, updateOnboardingStep]);

  return (
    <Center h="100vh">
      <Loader size="xl" />
    </Center>
  );
}

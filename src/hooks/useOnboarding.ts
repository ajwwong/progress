import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { OnboardingStep } from './onboardingSteps';

export interface UseOnboardingReturn {
  currentStep: OnboardingStep;
  updateOnboardingStep: (step: OnboardingStep) => Promise<void>;
  isStepComplete: (step: OnboardingStep) => boolean;
  hasCompletedOnboarding: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const medplum = useMedplum();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.NOT_STARTED);
  
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      console.log('useOnboarding: checkOnboardingStatus called');
      
      if (!medplum) {
        console.log('useOnboarding: medplum not available');
        return;
      }
      
      try {
        const profile = await medplum.getProfile();
        console.log('useOnboarding: got profile', JSON.stringify(profile, null, 2));
        
        // Get onboarding step from profile extension
        const onboardingStep = profile.extension?.find(
          ext => ext.url === 'https://progress.care/fhir/onboarding-step'
        )?.valueString as OnboardingStep || OnboardingStep.NOT_STARTED;
        
        console.log('useOnboarding: current step:', onboardingStep);
        setCurrentStep(onboardingStep);
        
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    checkOnboardingStatus();
  }, [medplum]);

  const updateOnboardingStep = async (step: OnboardingStep) => {
    if (!medplum) return;
    
    try {
      const profile = await medplum.getProfile();
      await medplum.updateResource({
        ...profile,
        extension: [
          ...(profile.extension?.filter(e => 
            e.url !== 'https://progress.care/fhir/onboarding-step'
          ) || []),
          {
            url: 'https://progress.care/fhir/onboarding-step',
            valueString: step
          }
        ]
      });
      setCurrentStep(step);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  return {
    currentStep,
    updateOnboardingStep,
    isStepComplete: (step: OnboardingStep) => isStepComplete(currentStep, step),
    hasCompletedOnboarding: currentStep === OnboardingStep.COMPLETED
  };
}

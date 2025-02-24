import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState, useEffect } from 'react';
import { Practitioner, Extension } from '@medplum/fhirtypes';
import { OnboardingStep } from './onboardingSteps';

export const ONBOARDING_STEP_URL = 'https://progress.care/fhir/onboarding-step';

export interface UseOnboardingReturn {
  currentStep: OnboardingStep;
  loading: boolean;
  updateOnboardingStep: (step: OnboardingStep) => Promise<void>;
  isStepCompleted: (step: OnboardingStep) => boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  setCurrentStep: (step: OnboardingStep) => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.NOT_STARTED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      const onboardingExt = profile.extension?.find(
        (e: Extension) => e.url === ONBOARDING_STEP_URL
      );
      console.log('Found onboarding extension:', onboardingExt);
      
      let stepValue = onboardingExt?.valueInteger;
      if (typeof stepValue === 'string') {
        stepValue = OnboardingStep[stepValue as keyof typeof OnboardingStep];
      }
      console.log('Processed step value:', stepValue);
      
      const validatedStep = typeof stepValue === 'number' && stepValue in OnboardingStep
        ? stepValue
        : OnboardingStep.NOT_STARTED;
      console.log('Final validated step:', validatedStep);
      
      setCurrentStep(validatedStep);
      setLoading(false);
    }
  }, [profile]);

  const updateOnboardingStep = async (step: OnboardingStep) => {
    if (!profile) return;

    try {
      // Get fresh profile to avoid conflicts
      const currentProfile = await medplum.readResource('Practitioner', profile.id!);
      
      // Find existing onboarding extension
      const extensions = currentProfile.extension || [];
      const onboardingExtIndex = extensions.findIndex(
        ext => ext.url === 'https://progress.care/fhir/onboarding-step'
      );

      // Create or update the extension
      const onboardingExt = {
        url: 'https://progress.care/fhir/onboarding-step',
        valueInteger: step
      };

      if (onboardingExtIndex >= 0) {
        extensions[onboardingExtIndex] = onboardingExt;
      } else {
        extensions.push(onboardingExt);
      }

      // Update the profile with new extension
      const updatedProfile = await medplum.updateResource({
        ...currentProfile,
        extension: extensions
      });

      // Force profile refresh
      await medplum.getProfile();
      
      setCurrentStep(step);
      setLoading(false);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw error;
    }
  };

  const isStepCompleted = (step: OnboardingStep): boolean => {
    return currentStep > step;
  };

  const hasCompletedOnboarding = currentStep === OnboardingStep.COMPLETED;

  const completeOnboarding = async () => {
    if (!profile) return;

    try {
      await updateOnboardingStep(OnboardingStep.COMPLETED);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  return {
    currentStep,
    setCurrentStep,
    updateOnboardingStep,
    isStepCompleted,
    hasCompletedOnboarding,
    loading,
    completeOnboarding
  };
}

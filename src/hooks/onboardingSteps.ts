export enum OnboardingStep {
  NOT_STARTED = 0,
  REGISTERED = 1,
  ORGANIZATION_SETUP = 2,
  ORGANIZATION_CREATED = 3,
  TRANSCRIPTION_TUTORIAL = 4,
  COMPLETED = 5
}

// Optional: Add a comment explaining the temporary bypass
/* 
  Organization setup step is temporarily disabled.
  Flow: NOT_STARTED -> REGISTERED -> TRANSCRIPTION_TUTORIAL -> COMPLETED
*/

// Helper to determine if a step is completed
export function isStepComplete(currentStep: OnboardingStep, checkStep: OnboardingStep): boolean {
  const steps = [
    OnboardingStep.NOT_STARTED,
    OnboardingStep.REGISTERED,
    OnboardingStep.ORGANIZATION_SETUP,
    OnboardingStep.ORGANIZATION_CREATED,
    OnboardingStep.TRANSCRIPTION_TUTORIAL,
    OnboardingStep.COMPLETED
  ];
  
  return steps.indexOf(currentStep) >= steps.indexOf(checkStep);
}

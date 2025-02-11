export enum OnboardingStep {
  NOT_STARTED = 'NOT_STARTED',
  REGISTERED = 'REGISTERED',                   // After test patient registration
  ORGANIZATION_SETUP = 'ORGANIZATION_SETUP',    // During organization setup
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED', // After organization setup, before logoff
  TRANSCRIPTION_TUTORIAL = 'TRANSCRIPTION_TUTORIAL',
  COMPLETED = 'COMPLETED'
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

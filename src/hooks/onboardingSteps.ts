export enum OnboardingStep {
  NOT_STARTED = 'not_started',
  REGISTERED = 'registered',                    // Basic registration complete
  ORGANIZATION_SETUP = 'organization_setup',     // Created/joined organization
  TRANSCRIPTION_TUTORIAL = 'transcription_tutorial', // Completed transcription tutorial
  COMPLETED = 'completed'                       // All onboarding complete
}

// Helper to determine if a step is completed
export function isStepComplete(currentStep: OnboardingStep, checkStep: OnboardingStep): boolean {
  const steps = [
    OnboardingStep.NOT_STARTED,
    OnboardingStep.REGISTERED,
    OnboardingStep.ORGANIZATION_SETUP,
    OnboardingStep.TRANSCRIPTION_TUTORIAL,
    OnboardingStep.COMPLETED
  ];
  
  return steps.indexOf(currentStep) >= steps.indexOf(checkStep);
}

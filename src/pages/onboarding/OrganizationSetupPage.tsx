import { Box, Button, Container, Group, Stack, Stepper, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingStep } from '../../hooks/onboardingSteps';
import { useState } from 'react';
import { OrganizationInvitePage } from '../OrganizationInvitePage';

export function OrganizationSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { updateOnboardingStep } = useOnboarding();
  const [activeStep, setActiveStep] = useState(0);

  const handleComplete = async () => {
    await updateOnboardingStep(OnboardingStep.ORGANIZATION_SETUP);
    navigate('/dashboard'); // Will route to next step
  };

  return (
    <Container size="lg">
      <Stack spacing="xl">
        <Box>
          <Title order={1}>Organization Setup</Title>
          <Text c="dimmed">Set up your organization or join an existing one</Text>
        </Box>

        <Stepper active={activeStep} onStepClick={setActiveStep}>
          <Stepper.Step label="Choose Option" description="Create or join">
            <Stack spacing="md" mt="xl">
              <Button 
                onClick={() => setActiveStep(1)}
                size="lg"
              >
                Create New Organization
              </Button>
              <Button 
                onClick={() => setActiveStep(2)}
                variant="light"
                size="lg"
              >
                Join Existing Organization
              </Button>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Create Organization" description="Set up new org">
            <OrganizationInvitePage 
              onSuccess={() => {
                setActiveStep(3);
              }}
            />
          </Stepper.Step>

          <Stepper.Step label="Join Organization" description="Accept invite">
            <Stack spacing="md" mt="xl">
              <Text>
                Enter the invitation code provided by your organization:
              </Text>
              {/* Add invitation code input component here */}
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Complete" description="Ready to continue">
            <Stack spacing="md" mt="xl">
              <Text>
                Organization setup complete! You can now proceed with the next steps.
              </Text>
              <Button onClick={handleComplete}>
                Continue to Next Step
              </Button>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </Stack>
    </Container>
  );
}

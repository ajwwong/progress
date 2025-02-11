import { Anchor, Button, Checkbox, Group, PasswordInput, Stack, Text, TextInput, Paper, Title } from '@mantine/core';
import { LoginAuthenticationResponse, normalizeOperationOutcome } from '@medplum/core';
import { OperationOutcome } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { ReactNode, useEffect, useState } from 'react';

// Helper function to initialize reCAPTCHA
const initRecaptcha = (siteKey: string) => {
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  document.head.appendChild(script);
};

// Helper function to get reCAPTCHA token
const getRecaptchaToken = async (siteKey: string): Promise<string> => {
  return new Promise((resolve) => {
    (window as any).grecaptcha.ready(() => {
      (window as any).grecaptcha
        .execute(siteKey, { action: 'submit' })
        .then((token: string) => resolve(token));
    });
  });
};

interface CustomNewUserFormProps {
  projectId: string;
  clientId?: string;
  googleClientId?: string;
  recaptchaSiteKey?: string;
  children?: ReactNode;
  handleAuthResponse: (response: LoginAuthenticationResponse) => void;
}

export function CustomNewUserForm(props: CustomNewUserFormProps): JSX.Element {
  const medplum = useMedplum();
  const [outcome, setOutcome] = useState<OperationOutcome>();

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    if (props.recaptchaSiteKey) {
      initRecaptcha(props.recaptchaSiteKey);
    }
  }, [props.recaptchaSiteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      let recaptchaToken = '';
      if (props.recaptchaSiteKey) {
        recaptchaToken = await getRecaptchaToken(props.recaptchaSiteKey);
      }

      const response = await medplum.startNewUser({
        projectId: props.projectId,
        clientId: props.clientId,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        remember: formData.get('remember') === 'true',
        recaptchaSiteKey: props.recaptchaSiteKey,
        recaptchaToken,
      });
      
      props.handleAuthResponse(response);
    } catch (err) {
      setOutcome(normalizeOperationOutcome(err));
    }
  };

  return (
    <>
      {outcome && (
        <Paper p="md" mb="md" bg="red.0" radius="md">
          <Text color="red">{outcome.issue?.[0]?.details?.text || 'An error occurred'}</Text>
        </Paper>
      )}
      
      <form onSubmit={handleSubmit}>
        <Stack>
          <Title order={2}>Test Patient Registration</Title>
          <Text c="dimmed">Create a test patient account to access patient portal</Text>

          <TextInput
            name="firstName"
            label="First Name"
            required
            autoFocus
            placeholder="Any test name"
          />
          
          <TextInput
            name="lastName"
            label="Last Name"
            required
            placeholder="Any test name"
          />
          
          <TextInput
            name="email"
            type="email"
            label="Email"
            description="⚠️ Use your real email for account access"
            required
            placeholder="your@email.com"
          />
          
          <PasswordInput
            name="password"
            label="Password"
            required
            placeholder="Create a secure password"
          />

          <Text size="xs" c="dimmed">
            By clicking Register you agree to the Practice Harbor{' '}
            <Anchor href="https://www.medplum.com/privacy">Privacy Policy</Anchor>
            {' and '}
            <Anchor href="https://www.medplum.com/terms">Terms of Service</Anchor>
          </Text>

          <Group justify="flex-end">
            <Button type="submit" loading={!!outcome}>
              Register Test Patient
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}

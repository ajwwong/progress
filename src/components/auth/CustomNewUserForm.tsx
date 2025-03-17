import { Anchor, Button, Checkbox, Group, PasswordInput, Stack, Text, TextInput, Paper, Title } from '@mantine/core';
import { LoginAuthenticationResponse, normalizeOperationOutcome } from '@medplum/core';
import { OperationOutcome } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { ReactNode, useEffect, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';

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

// Helper function to generate random email
const generateRandomEmail = (): string => {
  // First character must be a letter for email validation
  const firstChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  
  // Rest of the characters can include numbers
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const emailLength = 29; // 29 + first char = 30 characters
  const randomPart = Array.from({ length: emailLength }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  // Generate random domain (5 chars + .com)
  const domainPart = Array.from({ length: 5 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return `${firstChar}${randomPart}@${domainPart}.com`;
};

// Helper function to generate secure random password
const generateRandomPassword = (): string => {
  // Include all character types to satisfy password requirements
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Ensure at least one of each type
  const password = [
    upperChars[Math.floor(Math.random() * upperChars.length)],
    lowerChars[Math.floor(Math.random() * lowerChars.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)]
  ];
  
  // Fill the rest randomly (26 more characters)
  const allChars = upperChars + lowerChars + numbers + specialChars;
  const remainingLength = 26; // 26 + 4 initial = 30 characters
  
  const remainingChars = Array.from({ length: remainingLength }, () =>
    allChars[Math.floor(Math.random() * allChars.length)]
  );
  
  // Combine and shuffle all characters
  const shuffled = [...password, ...remainingChars]
    .sort(() => Math.random() - 0.5);
  
  return shuffled.join('');
};

export interface CustomNewUserFormProps {
  projectId: string;
  clientId?: string;
  googleClientId?: string;
  recaptchaSiteKey?: string;
  children?: ReactNode;
  handleAuthResponse: (response: LoginAuthenticationResponse) => void;
  onLoading?: (loading: boolean) => void;
  onSubmitComplete?: () => void;
}

export function CustomNewUserForm(props: CustomNewUserFormProps): JSX.Element {
  const medplum = useMedplum();
  const [outcome, setOutcome] = useState<OperationOutcome>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultLastName] = useState(() => new Date().toISOString());
  const [defaultEmail] = useState(() => generateRandomEmail());
  const [defaultPassword] = useState(() => generateRandomPassword());

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    if (props.recaptchaSiteKey) {
      initRecaptcha(props.recaptchaSiteKey);
    }
  }, [props.recaptchaSiteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      props.onSubmitComplete?.();
    } finally {
      setIsSubmitting(false);
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
          <div hidden>
            <Title order={2}>Test Patient Registration</Title>
            <Text c="dimmed">Create a test patient account to access patient portal</Text>

            <TextInput
              name="firstName"
              label="First Name"
              required
              defaultValue="Onboarding"
              readOnly
            />
            
            <TextInput
              name="lastName"
              label="Last Name"
              required
              defaultValue={defaultLastName}
              readOnly
            />
            
            <TextInput
              name="email"
              type="email"
              label="Email"
              required
              defaultValue={defaultEmail}
              readOnly
            />
            
            <PasswordInput
              name="password"
              label="Password"
              required
              defaultValue={defaultPassword}
              readOnly
            />

            <Text size="xs" c="dimmed">
              By clicking Register you agree to the Practice Harbor{' '}
              <Anchor href="https://www.medplum.com/privacy">Privacy Policy</Anchor>
              {' and '}
              <Anchor href="https://www.medplum.com/terms">Terms of Service</Anchor>
            </Text>
          </div>

          <Group justify="flex-end">
            <Button 
              type="submit" 
              loading={isSubmitting}
              size="xl" 
              radius="md" 
              fullWidth
              rightSection={!isSubmitting && <IconArrowRight size={20} />}
              styles={(theme) => ({
                root: {
                  backgroundColor: theme.colors.blue[6],
                  '&:hover': {
                    backgroundColor: theme.colors.blue[7],
                  },
                },
              })}
            >
              {isSubmitting ? 'Setting up your account...' : 'Sign Up for Free'}
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}

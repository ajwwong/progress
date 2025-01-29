import { BackgroundImage, Box, SimpleGrid } from '@mantine/core';
import { RegisterForm, useMedplumProfile } from '@medplum/react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { MEDPLUM_GOOGLE_CLIENT_ID, MEDPLUM_PROJECT_ID, MEDPLUM_RECAPTCHA_SITE_KEY } from '../config';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useMedplumProfile();

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (profile) {
      navigate('/calendar');
    }
  }, [profile, navigate]);

  const handleRegistrationSuccess = () => {
    // After successful registration, redirect to onboarding
    navigate('/calendar');
  };

  return (
    <SimpleGrid cols={2}>
      <Box pt={100} pb={200}>
        <RegisterForm
          type="patient"
          projectId={MEDPLUM_PROJECT_ID}
          googleClientId={MEDPLUM_GOOGLE_CLIENT_ID}
          recaptchaSiteKey={MEDPLUM_RECAPTCHA_SITE_KEY}
          onSuccess={handleRegistrationSuccess}
        >
          <h2>Provider Registration</h2>
        </RegisterForm>
      </Box>
      <BackgroundImage src="https://images.unsplash.com/photo-1556761175-4b46a572b786?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=crop&amp;w=1567&amp;q=80" />
    </SimpleGrid>
  );
}

export default RegisterPage;

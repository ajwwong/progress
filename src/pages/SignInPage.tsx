import { Container, Image, Title, Text, Stack } from '@mantine/core';
import { Logo, SignInForm } from '@medplum/react';
import { useNavigate } from 'react-router-dom';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();

  const handleSignInSuccess = () => {
    console.log('SignInPage: Redirecting to dashboard');
    navigate('/dashboard');     
  };

  return (
    <SignInForm
      // Configure according to your settings
      //googleClientId="921088377005-3j1sa10vr6hj86jgmdfh2l53v3mp7lfi.apps.googleusercontent.com" // use this one to run against prod
     // googleClientId="397236612778-c0b5tnjv98frbo1tfuuha5vkme3cmq4s.apps.googleusercontent.com" // use this one for localhost
      clientId="c9aa51a2-263b-49f1-b861-fddfb13bc54c"
      projectId="bd5c50fc-d625-49a8-8aea-17f7e8b59c76"
      onSuccess={handleSignInSuccess}
    >
      <Stack align="center" spacing="xs">
        <Image
          src="/droplet.png"
          alt="Practice Harbor Logo"
          width={48}
          height={48}
          mx="auto"
          mb={8}
          style={{ width: 48, height: 48 }}
        />
        <Title
          align="center"
          sx={(theme) => ({
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900
          })}
        >
          Sign in to Progress Notes
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          Welcome back.  Glad you're here.
        </Text>
      </Stack>
    </SignInForm>
  );
}

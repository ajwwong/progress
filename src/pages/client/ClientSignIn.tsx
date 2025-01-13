import { Title } from '@mantine/core';
import { Logo, SignInForm } from '@medplum/react';
import { useNavigate } from 'react-router-dom';

export function ClientSignIn(): JSX.Element {
  const navigate = useNavigate();
  return (
    <SignInForm
      googleClientId="397236612778-c0b5tnjv98frbo1tfuuha5vkme3cmq4s.apps.googleusercontent.com"
      onSuccess={() => navigate('/portal/dashboard')}
    >
      <Logo size={32} />
      <Title>Client Portal Sign In</Title>
    </SignInForm>
  );
}
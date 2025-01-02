import { Box, Button, Group, PasswordInput, TextInput, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { MedplumClient } from '@medplum/core';
import { Document, getRecaptcha, initRecaptcha } from '@medplum/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RECAPTCHA_SITE_KEY = '6LdyXaoqAAAAAP2G7TLmZGo6NTzzGhE7eqN6UPqV';

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    initRecaptcha(RECAPTCHA_SITE_KEY);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await getRecaptcha(RECAPTCHA_SITE_KEY);
      
      const medplum = new MedplumClient();
      const response = await medplum.startNewUser({
        firstName,
        lastName,
        email,
        password,
        projectId: 'bd5c50fc-d625-49a8-8aea-17f7e8b59c76',
        recaptchaSiteKey: RECAPTCHA_SITE_KEY,
        recaptchaToken
      });

      if (response.code) {
        await medplum.processCode(response.code);
        
        showNotification({
          title: 'Registration Successful',
          message: 'Welcome to the platform!',
          color: 'green'
        });
        
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showNotification({
        title: 'Registration Failed',
        message: error instanceof Error ? error.message : 'Registration failed',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Document>
      <Box sx={{ maxWidth: 400 }} mx="auto" mt={40}>
        <Title order={1} align="center" mb={30}>
          Provider Registration
        </Title>

          <form onSubmit={handleSubmit}>
            <TextInput
              required
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              mb="md"
            />

            <TextInput
              required
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              mb="md"
            />

            <TextInput
              required
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              mb="md"
            />

          <PasswordInput
            required
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mb="xl"
          />

          <Group position="center">
            <Button type="submit" loading={loading}>
              Register as Provider
            </Button>
          </Group>
        </form>
      </Box>
    </Document>
  );
}

export default RegisterPage;

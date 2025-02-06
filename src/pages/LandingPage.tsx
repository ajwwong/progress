import { Anchor, Button, Stack, Text, Title, Group } from '@mantine/core';
import { Document } from '@medplum/react';
import { Link } from 'react-router-dom';

export function LandingPage(): JSX.Element {
  return (
    <Document width={500}>
      <Stack align="center">
        <Title order={2}>Welcome!</Title>
        <Text>
          This application demonstrates provider registration and management using Medplum. 
          If you're a new provider, please register below. Existing providers can sign in.
        </Text>
        <Group>
          <Button component={Link} to="/register" variant="filled" color="blue">
            Register as Patient
          </Button>
          <Button component={Link} to="/provider-register" variant="filled" color="green">
            Register as Provider
          </Button>
          <Button component={Link} to="/organization-invite" variant="filled" color="violet">
            Invite Organization
          </Button>
          <Button component={Link} to="/signin" variant="light">
            Sign in
          </Button>
        </Group>
      </Stack>
    </Document>
  );
}

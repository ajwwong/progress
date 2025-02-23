import { Modal, Stack, Text, Button, Group, Paper, Divider } from '@mantine/core';
import { useMedplumProfile } from '@medplum/react';
import { useState } from 'react';
import { Practitioner, Resource } from '@medplum/fhirtypes';

interface SignNoteModalProps {
  opened: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
}

// Type guard to check if profile is Practitioner
function isPractitioner(profile: Resource | undefined): profile is Practitioner {
  return profile?.resourceType === 'Practitioner';
}

export function SignNoteModal({ opened, onClose, onSign }: SignNoteModalProps): JSX.Element {
  const profile = useMedplumProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPractitioner(profile)) {
    throw new Error('Only practitioners can sign notes');
  }

  const qualification = profile.qualification?.[0]?.code?.text || 'Ph.D.';

  const handleSign = async () => {
    try {
      setIsSubmitting(true);
      await onSign();
      onClose();
    } catch (error) {
      console.error('Error signing note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Sign and lock progress note"
      size="md"
    >
      <Stack gap="md">
        <Stack gap="xs">
          <Text fw={500}>Your name</Text>
          <Text>{profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}</Text>
        </Stack>

        <Stack gap="xs">
          <Text fw={500}>Credentials</Text>
          <Text>{qualification}</Text>
        </Stack>

        <Divider my="md" />

        <Paper withBorder p="md" bg="gray.0">
          <Stack gap="xs">
            <Text fw={500}>Preview</Text>
            <Text>{profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}</Text>
            <Text size="sm">
              Signed by {profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}
              {qualification && `, ${qualification}`}
            </Text>
            <Text size="sm" c="dimmed">
              {new Date().toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </Text>
          </Stack>
        </Paper>

        <Text size="sm" c="dimmed">
          Signed and locked notes are uneditable. <Text component="span" c="blue" style={{ cursor: 'pointer' }}>Learn about signing and locking</Text>
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSign} loading={isSubmitting}>
            Sign and lock
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

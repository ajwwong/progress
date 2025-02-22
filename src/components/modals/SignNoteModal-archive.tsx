import { Modal, Stack, Text, Button, Group, Paper, Divider } from '@mantine/core';
import { useMedplumProfile } from '@medplum/react';
import { useState } from 'react';

interface SignNoteModalProps {
  opened: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
}

export function SignNoteModal({ opened, onClose, onSign }: SignNoteModalProps): JSX.Element {
  const profile = useMedplumProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <Stack spacing="md">
        <Stack spacing="xs">
          <Text fw={500}>Your name</Text>
          <Text>{profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}</Text>
        </Stack>

        <Stack spacing="xs">
          <Text fw={500}>Credentials</Text>
          <Text>{profile?.qualification?.[0]?.code?.text || 'Ph.D.'}</Text>
        </Stack>

        <Divider my="md" />

        <Paper withBorder p="md" bg="gray.0">
          <Stack spacing="xs">
            <Text fw={500}>Preview</Text>
            <Text>{profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}</Text>
            <Text size="sm">
              Signed by {profile?.name?.[0]?.given?.[0]} {profile?.name?.[0]?.family}
              {profile?.qualification?.[0]?.code?.text && `, ${profile.qualification[0].code.text}`}
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
          Signed and locked notes are uneditable. <Text component="span" c="blue" sx={{ cursor: 'pointer' }}>Learn about signing and locking</Text>
        </Text>

        <Group position="right" mt="md">
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

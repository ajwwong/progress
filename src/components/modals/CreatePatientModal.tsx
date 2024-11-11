import { Modal, Stack, TextInput, Button, Group } from '@mantine/core';
import { useState } from 'react';

interface CreatePatientModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (patientName: string) => Promise<void>;
}

export function CreatePatientModal({ opened, onClose, onSubmit }: CreatePatientModalProps): JSX.Element {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(name);
      setName(''); // Reset form
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error in CreatePatientModal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Patient"
      size="md"
    >
      <Stack spacing="md">
        <TextInput
          label="Full Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter patient's full name"
          disabled={isSubmitting}
        />
        <Group position="right" mt="md">
          <Button 
            variant="subtle" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            loading={isSubmitting}
          >
            Create Patient
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 
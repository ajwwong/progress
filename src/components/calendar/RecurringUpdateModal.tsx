import { Modal, Text, Group, Button, Stack } from '@mantine/core';

interface RecurringUpdateModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RecurringUpdateModal({ opened, onClose, onConfirm, onCancel }: RecurringUpdateModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Update Recurring Appointment"
      size="md"
    >
      <Stack gap="md">
        <Text>This appointment is part of a recurring series. How would you like to update it?</Text>
        
        <Group justify="flex-end" mt="xl">
          <Button variant="light" onClick={() => {
            onCancel();
            onClose();
          }}>
            Update only this appointment
          </Button>
          <Button onClick={() => {
            onConfirm();
            onClose();
          }}>
            Update this and future appointments
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
} 
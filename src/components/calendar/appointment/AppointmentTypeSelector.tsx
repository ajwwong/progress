import { Select, Checkbox } from '@mantine/core';
import { appointmentTypes } from '../constants';

interface AppointmentTypeSelectorProps {
  type: 'ROUTINE' | 'FOLLOWUP';
  isRecurring: boolean;
  onTypeChange: (type: 'ROUTINE' | 'FOLLOWUP') => void;
  onRecurringChange: (isRecurring: boolean) => void;
}

export function AppointmentTypeSelector({
  type,
  isRecurring,
  onTypeChange,
  onRecurringChange,
}: AppointmentTypeSelectorProps) {
  return (
    <>
      <Select
        label="Appointment Type"
        value={type}
        onChange={(value) => onTypeChange(value as 'ROUTINE' | 'FOLLOWUP')}
        data={appointmentTypes}
        required
      />
      <Checkbox
        label="Recurring"
        checked={isRecurring}
        onChange={(e) => onRecurringChange(e.currentTarget.checked)}
      />
    </>
  );
}
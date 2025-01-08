import { Select, Checkbox } from '@mantine/core';
import { appointmentTypes } from '../constants';

interface AppointmentTypeSelectorProps {
  type: string;
  isRecurring: boolean;
  onTypeChange: (type: string) => void;
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
        onChange={(value) => onTypeChange(value || appointmentTypes[0].value)}
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
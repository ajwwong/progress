import { Box, Group, Text } from '@mantine/core';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Appointment } from '../../types/calendar';

interface AppointmentItemProps {
  appointment: Appointment;
  isDragging?: boolean;
  onClick?: () => void;
}

const typeColors = {
  checkup: 'cyan',
  surgery: 'red',
  consultation: 'violet',
  followup: 'teal',
} as const;

export function AppointmentItem({ appointment, isDragging = false, onClick }: AppointmentItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: appointment,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 1000,
  } : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={{
        ...style,
        cursor: 'grab',
        opacity: isDragging ? 0.8 : 1,
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Box
        bg={`${typeColors[appointment.type]}.0`}
        c={`${typeColors[appointment.type]}.9`}
        py={2}
        px={4}
        style={(theme) => ({
          borderRadius: theme.radius.sm,
          fontSize: theme.fontSizes.xs,
          border: `1px solid ${theme.colors[typeColors[appointment.type]][2]}`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'transform 0.15s ease',
          '&:hover': {
            transform: 'translateX(2px)',
          }
        })}
      >
        <Group gap={4} wrap="nowrap">
          <Text size="xs" fw={500} style={{ minWidth: 'auto' }}>
            {format(appointment.start, 'HH:mm')}
          </Text>
          <Text size="xs" truncate>
            {appointment.patientName}
          </Text>
        </Group>
      </Box>
    </Box>
  );
}
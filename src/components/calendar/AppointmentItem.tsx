import { Box, Text, Group } from '@mantine/core';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import type { Appointment } from '../../types/calendar';
import { appointmentTypes } from './constants';

interface AppointmentItemProps {
  appointment: Appointment;
  onClick: () => void;
  variant?: 'month' | 'week';
  style?: React.CSSProperties;
}

const statusColors = {
  'booked-future': ['var(--mantine-color-blue-0)', 'var(--mantine-color-blue-9)'],
  'booked-past': ['var(--mantine-color-green-0)', 'var(--mantine-color-green-9)'],
  'cancelled': ['var(--mantine-color-yellow-0)', 'var(--mantine-color-yellow-9)'],
  'noshow': ['var(--mantine-color-red-0)', 'var(--mantine-color-red-9)'],
} as const;

export function AppointmentItem({ 
  appointment, 
  onClick,
  variant = 'month',
  style 
}: AppointmentItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: appointment,
  });

  const appointmentTypeLabel = appointmentTypes.find(t => t.value === appointment.type)?.label || 'Follow-up Therapy';
  
  // Determine if appointment is in the past
  const isBookedPastAppointment = appointment.status === 'booked' && appointment.start < new Date();
  const effectiveStatus = appointment.status === 'booked' 
    ? (isBookedPastAppointment ? 'booked-past' : 'booked-future')
    : appointment.status;
  
  const [bgColor, textColor] = statusColors[effectiveStatus] || statusColors['booked-future'];
  const isStrikethrough = appointment.status === 'cancelled' || appointment.status === 'noshow';

  const baseStyles: React.CSSProperties = {
    backgroundColor: bgColor,
    color: textColor,
    cursor: 'grab',
    borderRadius: 4,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    zIndex: 2,
    ...style
  };

  const variantStyles: React.CSSProperties = variant === 'week' ? {
    position: 'absolute',
    left: 2,
    right: 2,
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  } : {
    padding: '2px 4px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    borderRadius: 6,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.05)'
  };

  return (
    <Box
      className="appointment-item"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        ...baseStyles,
        ...variantStyles
      }}
    >
      {variant === 'week' ? (
        <>
          <Text 
            size="xs" 
            fw={600}
            style={{ lineHeight: 1.2 }}
          >
            {format(appointment.start, 'h:mm a')}
          </Text>
          <Text 
            size="sm"
            fw={500}
            style={{ 
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: isStrikethrough ? 'line-through' : 'none'
            }}
          >
            {appointment.patientName}
          </Text>
          <Text 
            size="xs"
            style={{ 
              lineHeight: 1.2,
              opacity: 0.8,
              fontStyle: 'italic'
            }}
          >
            {appointmentTypeLabel}
          </Text>
        </>
      ) : (
        <Group gap={5} wrap="nowrap" style={{ flex: 1 }}>
          <Text 
            size="xs"
            fw={500} 
            component="span"
            style={{ 
              lineHeight: '16px',
              width: '48px'
            }}
          >
            {format(appointment.start, 'h:mm a')}
          </Text>
          <Text 
            size="xs"
            fw={500} 
            component="span"
            style={{ 
              flex: 1,
              lineHeight: '16px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'clip',
              textDecoration: isStrikethrough ? 'line-through' : 'none'
            }}
          >
            {appointment.patientName}
          </Text>
        </Group>
      )}
    </Box>
  );
}
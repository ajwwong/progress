import { Box, Text } from '@mantine/core';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import type { Appointment } from '../types/calendar';

interface AppointmentItemProps {
  appointment: Appointment;
  onClick: () => void;
  variant?: 'month' | 'week';
  style?: React.CSSProperties;
}

const typeColors = {
  'intake therapy': ['var(--mantine-color-cyan-0)', 'var(--mantine-color-cyan-9)'],
  'followup therapy': ['var(--mantine-color-teal-0)', 'var(--mantine-color-teal-9)'],
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

  const [bgColor, textColor] = typeColors[appointment.type] || typeColors['followup therapy'];

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
    marginBottom: 2,
    height: '20px',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <Box
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
              textOverflow: 'ellipsis'
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
            {appointment.type}
          </Text>
        </>
      ) : (
        <Text 
          size="xs"
          fw={500} 
          style={{ 
            flex: 1, 
            lineHeight: '16px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'clip'
          }}
        >
          {format(appointment.start, 'h:mm a')} - {appointment.patientName}
        </Text>
      )}
    </Box>
  );
}
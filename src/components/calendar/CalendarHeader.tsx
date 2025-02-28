import { Group, Button, Title, SegmentedControl } from '@mantine/core';
import { IconPlus, IconChevronLeft, IconChevronRight, IconUser } from '@tabler/icons-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { TodayButton } from './TodayButton';
import type { CalendarView } from '../../types/calendar';

interface CalendarHeaderProps {
  selectedDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNewAppointment: () => void;
  onNewPatient: () => void;
  onDateChange: (date: Date) => void;
}

export function CalendarHeader({ 
  selectedDate, 
  view, 
  onViewChange, 
  onNewAppointment, 
  onNewPatient,
  onDateChange 
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    switch (view) {
      case 'day':
        onDateChange(subDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getHeaderTitle = () => {
    switch (view) {
      case 'week': {
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);
        
        if (format(weekStart, 'M') !== format(weekEnd, 'M')) {
          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        
        if (format(weekStart, 'yyyy') !== format(weekEnd, 'yyyy')) {
          return `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
      }
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      default:
        return format(selectedDate, 'MMMM yyyy');
    }
  };

  return (
    <Group justify="space-between" align="center">
      <Group>
        <Group gap={8}>
          <TodayButton onClick={handleToday} />
          <Button.Group>
            <Button 
              variant="default" 
              onClick={handlePrevious}
              styles={(theme) => ({
                root: {
                  borderRight: `1px solid ${theme.colors.gray[3]}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.colors.gray[0],
                  }
                }
              })}
            >
              <IconChevronLeft size={18} />
            </Button>
            <Button 
              variant="default" 
              onClick={handleNext}
              styles={(theme) => ({
                root: {
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.colors.gray[0],
                  }
                }
              })}
            >
              <IconChevronRight size={18} />
            </Button>
          </Button.Group>
        </Group>
        <Title order={3}>{getHeaderTitle()}</Title>
      </Group>
      <Group>
        <SegmentedControl
          value={view}
          onChange={(value) => onViewChange(value as CalendarView)}
          data={[
            { label: 'Month', value: 'month' },
            { label: 'Week', value: 'week' },
            { label: 'Day', value: 'day' },
          ]}
        />
        <Button 
          variant="light" 
          leftSection={<IconUser size={18} />} 
          onClick={onNewPatient}
        >
          New Patient
        </Button>
        <Button 
          leftSection={<IconPlus size={18} />} 
          onClick={onNewAppointment}
        >
          New Appointment
        </Button>
      </Group>
    </Group>
  );
}
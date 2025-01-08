import { Button, ButtonProps } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';

interface TodayButtonProps extends ButtonProps {
  onClick: () => void;
}

export function TodayButton({ onClick, ...props }: TodayButtonProps) {
  return (
    <Button
      leftSection={<IconCalendar size={16} />}
      variant="subtle"
      onClick={onClick}
      styles={(theme) => ({
        root: {
          backgroundColor: theme.colors.blue[0],
          color: theme.colors.blue[7],
          border: 'none',
          transition: 'all 0.2s ease',
          padding: '6px 12px',
          height: '36px',

          '&:hover': {
            backgroundColor: theme.colors.blue[1],
            transform: 'translateY(-1px)',
          },

          '&:active': {
            transform: 'translateY(0)',
          }
        },
      })}
      {...props}
    >
      Today
    </Button>
  );
}
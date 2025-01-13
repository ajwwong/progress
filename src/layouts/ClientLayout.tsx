import { AppShell, Group, Button, Stack } from '@mantine/core';
import { IconCalendar, IconUser, IconHome, IconForms, IconReceipt, IconFileInvoice } from '@tabler/icons-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useMedplum } from '@medplum/react';

export function ClientLayout() {
  const medplum = useMedplum();
  const navigate = useNavigate();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <div>Client Portal</div>
          <Button variant="light" onClick={() => medplum.signOut()}>
            Sign Out
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack>
          <Button
            component={Link}
            to="/portal/dashboard"
            variant="subtle"
            fullWidth
            leftSection={<IconHome size={16} />}
          >
            Dashboard
          </Button>
          <Button
            component={Link}
            to="/portal/appointments"
            variant="subtle"
            fullWidth
            leftSection={<IconCalendar size={16} />}
          >
            Appointments
          </Button>
          <Button
            component={Link}
            to="/portal/forms"
            variant="subtle"
            fullWidth
            leftSection={<IconForms size={16} />}
          >
            Forms
          </Button>
          <Button
            component={Link}
            to="/portal/billing"
            variant="subtle"
            fullWidth
            leftSection={<IconReceipt size={16} />}
          >
            Billing & Payments
          </Button>
          <Button
            component={Link}
            to="/portal/profile"
            variant="subtle"
            fullWidth
            leftSection={<IconUser size={16} />}
          >
            Profile
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
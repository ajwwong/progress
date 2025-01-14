import { Box, NavLink, Stack, Title, Group, ThemeIcon, Text } from '@mantine/core';
import { Calendar, Users, FileText, Activity, Settings, Bell, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Calendar', icon: Calendar, path: '/' },
  { name: 'Clients', icon: Users, path: '/clients' },
  { name: 'Records', icon: FileText, path: '/records' },
  { name: 'Analytics', icon: Activity, path: '/analytics' },
];

const secondaryNav = [
  { name: 'Settings', icon: Settings, path: '/settings' },
  { name: 'Notifications', icon: Bell, path: '/notifications' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box 
      p="md" 
      style={(theme) => ({
        height: '100%',
        background: theme.white,
        borderRight: `1px solid ${theme.colors.gray[2]}`,
        display: 'flex',
        flexDirection: 'column'
      })}
    >
      <Box mb={40}>
        <Group mb={30}>
          <ThemeIcon size={36} radius="md" variant="light" color="blue">
            <Briefcase size={22} />
          </ThemeIcon>
          <Text 
            size="xl" 
            fw={600}
            style={(theme) => ({
              letterSpacing: '-0.3px',
              background: `linear-gradient(135deg, ${theme.colors.blue[8]}, ${theme.colors.blue[5]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            })}
          >
            TherapistPro
          </Text>
        </Group>
      </Box>

      <Stack gap={4} mb={30}>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            label={
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">{item.name}</Text>
                {item.name === 'Clients' && (
                  <Text size="xs" c="dimmed">482</Text>
                )}
              </Group>
            }
            leftSection={
              <ThemeIcon variant="light" size="sm" color={location.pathname === item.path ? 'blue' : 'gray'}>
                <item.icon size={16} />
              </ThemeIcon>
            }
            rightSection={item.name === 'Calendar' && <ChevronRight size={14} />}
            active={location.pathname === item.path}
            variant={location.pathname === item.path ? 'filled' : 'light'}
            onClick={() => navigate(item.path)}
            style={(theme) => ({
              borderRadius: theme.radius.md,
              marginBottom: 2
            })}
          />
        ))}
      </Stack>

      <Box style={{ flex: 1 }} />

      <Stack gap={4}>
        {secondaryNav.map((item) => (
          <NavLink
            key={item.name}
            label={<Text size="sm">{item.name}</Text>}
            leftSection={
              <ThemeIcon variant="light" size="sm" color={location.pathname === item.path ? 'blue' : 'gray'}>
                <item.icon size={16} />
              </ThemeIcon>
            }
            active={location.pathname === item.path}
            variant={location.pathname === item.path ? 'filled' : 'light'}
            onClick={() => navigate(item.path)}
            style={(theme) => ({
              borderRadius: theme.radius.md,
              marginBottom: 2
            })}
          />
        ))}
      </Stack>
    </Box>
  );
}
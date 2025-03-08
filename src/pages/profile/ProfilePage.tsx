import { Container, Tabs } from '@mantine/core';
import { IconSettings, IconAlertCircle, IconCreditCard, IconBuilding } from '@tabler/icons-react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { ProfileSettings } from './components/ProfileSettings';
import { NotePreferences } from './components/NotePreferences';
import { PasswordChange } from './components/PasswordChange';
import { OrganizationSettings } from './components/OrganizationSettings';
import { SubscriptionSettings } from './components/SubscriptionSettings';

const tabRoutes = {
  '/settings/profile': 'profile',
  '/settings/note-preferences': 'note-preferences',
  '/settings/change-password': 'change-password',
  '/settings/organization': 'organization',
  '/settings/subscription': 'subscription'
};

export function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = tabRoutes[location.pathname as keyof typeof tabRoutes] || 'profile';

  const handleTabChange = (value: string | null) => {
    if (!value) return;
    const route = Object.entries(tabRoutes).find(([_, tab]) => tab === value)?.[0] || '/settings/profile';
    navigate(route);
  };

  return (
    <Container size="md" py="xl">
      <Tabs value={currentTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconSettings size={14} />}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="note-preferences" leftSection={<IconAlertCircle size={14} />}>
            Note Preferences
          </Tabs.Tab>
          <Tabs.Tab value="change-password" leftSection={<IconAlertCircle size={14} />}>
            Change Password
          </Tabs.Tab>
          <Tabs.Tab value="organization" leftSection={<IconBuilding size={14} />}>
            Organization
          </Tabs.Tab>
          <Tabs.Tab value="subscription" leftSection={<IconCreditCard size={14} />}>
            Subscription
          </Tabs.Tab>
        </Tabs.List>

        <Routes>
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="note-preferences" element={<NotePreferences />} />
          <Route path="change-password" element={<PasswordChange />} />
          <Route path="organization" element={<OrganizationSettings />} />
          <Route path="subscription" element={<SubscriptionSettings />} />
          <Route path="*" element={<Navigate to="/settings/profile" replace />} />
        </Routes>
      </Tabs>
    </Container>
  );
}

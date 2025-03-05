import { Container, Tabs } from '@mantine/core';
import { IconSettings, IconAlertCircle, IconCreditCard, IconBuilding } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ProfileSettings } from './components/ProfileSettings';
import { NotePreferences } from './components/NotePreferences';
import { BillingSection } from './components/BillingSection';
import { PasswordChange } from './components/PasswordChange';
import { OrganizationSettings } from './components/OrganizationSettings';

export function ProfilePage(): JSX.Element {
  const location = useLocation();
  const defaultTab = location.state?.defaultTab || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state]);

  return (
    <Container size="md" py="xl">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconSettings size={14} />}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="note-preferences" leftSection={<IconAlertCircle size={14} />}>
            Note Preferences
          </Tabs.Tab>
          <Tabs.Tab value="billing" leftSection={<IconCreditCard size={14} />}>
            Billing
          </Tabs.Tab>
          <Tabs.Tab value="change-password" leftSection={<IconAlertCircle size={14} />}>
            Change Password
          </Tabs.Tab>
          <Tabs.Tab value="organization" leftSection={<IconBuilding size={14} />}>
            Organization
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <ProfileSettings />
        </Tabs.Panel>

        <Tabs.Panel value="note-preferences" pt="xl">
          <NotePreferences />
        </Tabs.Panel>

        <Tabs.Panel value="billing" pt="xl">
          <BillingSection />
        </Tabs.Panel>

        <Tabs.Panel value="change-password" pt="xl">
          <PasswordChange />
        </Tabs.Panel>

        <Tabs.Panel value="organization" pt="xl">
          <OrganizationSettings />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

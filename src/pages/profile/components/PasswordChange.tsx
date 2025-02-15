import { Stack, TextInput, Title, Text, Button, Paper } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck } from '@tabler/icons-react';
import { normalizeErrorString } from '@medplum/core';

export function PasswordChange(): JSX.Element {
  const medplum = useMedplum();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      await medplum.post('auth/changepassword', {
        oldPassword,
        newPassword
      });

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Password changed successfully'
      });
    } catch (err) {
      setError(normalizeErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Change Password</Title>
        <Text c="dimmed">Update your account password</Text>
      </div>

      <Paper withBorder p="xl">
        <form onSubmit={handlePasswordChange}>
          <Stack>
            <TextInput
              label="Current Password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />

            <TextInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <TextInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <Text color="red">{error}</Text>}

            <Button type="submit" loading={loading}>
              Change Password
            </Button>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}

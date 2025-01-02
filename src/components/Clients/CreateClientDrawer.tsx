import { 
  Drawer,
  Stack,
  TextInput,
  Group,
  Radio,
  Checkbox,
  Text,
  Button,
  Box,
  ActionIcon,
  Badge,
  Switch
} from '@mantine/core';
import { Plus, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateClientDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateClientDrawer({ opened, onClose }: CreateClientDrawerProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    onClose();
    navigate('/client-intake', { 
      state: { 
        clientName: `${firstName} ${lastName}`,
        clientEmail: email
      }
    });
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group position="apart" style={{ width: '100%' }}>
          <Text fw={500}>Create client</Text>
          <Button onClick={handleContinue}>Continue</Button>
        </Group>
      }
    >
      <Stack gap="xl" p="md">
        <Stack gap="md">
          <Group align="flex-start" position="apart">
            <Box>
              <Text fw={500} mb="xs">Client type</Text>
              <Radio.Group defaultValue="adult">
                <Group>
                  <Radio value="adult" label="Adult" />
                  <Radio value="minor" label="Minor" />
                  <Radio value="couple" label="Couple" />
                </Group>
              </Radio.Group>
            </Box>
            <Box>
              <Text fw={500} mb="xs">Waitlist</Text>
              <Checkbox label="Add to waitlist" />
            </Box>
          </Group>

          <Group grow>
            <TextInput
              label="Legal first name"
              placeholder="Enter first name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
            />
            <TextInput
              label="Legal last name"
              placeholder="Enter last name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
            />
          </Group>
        </Stack>

        <Stack gap="md">
          <Text fw={500}>Contact details</Text>
          <Text size="sm" c="dimmed">
            Manage contact info for reminders and notifications. An email is needed for granting Client Portal access.
          </Text>

          <Stack gap="xs">
            <Group position="apart">
              <Text fw={500}>Email</Text>
              <TextInput
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                style={{ flex: 1, marginLeft: 16 }}
              />
            </Group>
            <Group position="apart">
              <Text fw={500}>Phone</Text>
              <Button 
                variant="subtle" 
                size="xs"
                leftSection={<Plus size={14} />}
              >
                Add phone
              </Button>
            </Group>
          </Stack>
        </Stack>

        <Stack gap="md">
          <Group position="apart">
            <Text fw={500}>Reminder and notification options</Text>
            <Badge variant="outline">Optional</Badge>
          </Group>

          <Stack gap="md">
            <Group position="apart">
              <Group>
                <Text>Upcoming appointments</Text>
                <ActionIcon variant="subtle" size="sm">
                  <HelpCircle size={14} />
                </ActionIcon>
              </Group>
              <Switch />
            </Group>
            <Box pl="md">
              <Stack gap="xs">
                <TextInput
                  placeholder="No email"
                  disabled
                />
                <Group align="center">
                  <TextInput
                    placeholder="No phone"
                    disabled
                    style={{ flex: 1 }}
                  />
                  <Radio.Group>
                    <Group>
                      <Radio value="text" label="Text" disabled />
                      <Radio value="voice" label="Voice" disabled />
                    </Group>
                  </Radio.Group>
                </Group>
              </Stack>
            </Box>

            <Group position="apart">
              <Group>
                <Text>Incomplete documents</Text>
                <ActionIcon variant="subtle" size="sm">
                  <HelpCircle size={14} />
                </ActionIcon>
              </Group>
              <Switch />
            </Group>
            <Box pl="md">
              <Stack gap="xs">
                <TextInput
                  placeholder="No email"
                  disabled
                />
                <Group align="center">
                  <TextInput
                    placeholder="No phone"
                    disabled
                    style={{ flex: 1 }}
                  />
                  <Badge>Text only</Badge>
                </Group>
              </Stack>
            </Box>

            <Group position="apart">
              <Group>
                <Text>Cancellations</Text>
                <ActionIcon variant="subtle" size="sm">
                  <HelpCircle size={14} />
                </ActionIcon>
              </Group>
              <Switch />
            </Group>
            <Box pl="md">
              <TextInput
                placeholder="No email"
                disabled
              />
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}
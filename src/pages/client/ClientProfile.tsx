import { Title, Paper, Stack, TextInput, Button, Group, Text, Badge } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, ChargeItem } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCreditCard } from '@tabler/icons-react';

export function ClientProfile() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<any>();
  const [formData, setFormData] = useState({
    email: profile.telecom?.find(t => t.system === 'email')?.value || '',
    phone: profile.telecom?.find(t => t.system === 'phone')?.value || '',
    address: profile.address?.[0]?.line?.[0] || '',
    city: profile.address?.[0]?.city || '',
    state: profile.address?.[0]?.state || '',
    postalCode: profile.address?.[0]?.postalCode || '',
  });

  useEffect(() => {
    // Load payment method
    medplum.searchResources('PaymentMethod', {
      subject: `Patient/${profile.id}`,
      status: 'active'
    }).then(methods => setPaymentMethod(methods[0]));

    // Load billing history
    medplum.searchResources('ChargeItem', {
      subject: `Patient/${profile.id}`,
      _sort: '-occurrence'
    }).then(setCharges);
  }, [medplum, profile.id]);

  const handleSave = async () => {
    try {
      await medplum.updateResource({
        ...profile,
        telecom: [
          { system: 'email', value: formData.email },
          { system: 'phone', value: formData.phone }
        ],
        address: [{
          line: [formData.address],
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        }]
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <Stack spacing="lg">
      <Group position="apart">
        <Title order={2}>My Profile</Title>
        <Button 
          variant="light"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </Group>

      <Paper p="md" withBorder>
        <Stack spacing="md">
          <TextInput
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
          />
          <TextInput
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            disabled={!isEditing}
          />
          <TextInput
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            disabled={!isEditing}
          />
          <Group grow>
            <TextInput
              label="City"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              disabled={!isEditing}
            />
            <TextInput
              label="State"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              disabled={!isEditing}
            />
            <TextInput
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
              disabled={!isEditing}
            />
          </Group>

          {isEditing && (
            <Group position="right" mt="md">
              <Button onClick={handleSave}>Save Changes</Button>
            </Group>
          )}
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Stack spacing="md">
          <Group position="apart">
            <Title order={3}>Payment Information</Title>
            <Button
              variant="light"
              leftIcon={<IconCreditCard size={16} />}
              onClick={() => navigate('/portal/payment')}
            >
              {paymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
            </Button>
          </Group>

          {paymentMethod ? (
            <Group>
              <IconCreditCard size={20} />
              <Text>Card ending in {paymentMethod.identifier?.[0]?.value?.slice(-4)}</Text>
              <Badge color="green">Active</Badge>
            </Group>
          ) : (
            <Text c="dimmed">No payment method on file</Text>
          )}
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={3} mb="md">Billing History</Title>
        <Stack spacing="md">
          {charges.map((charge) => (
            <Group key={charge.id} position="apart">
              <div>
                <Text>{new Date(charge.occurrence as string).toLocaleDateString()}</Text>
                <Text size="sm" c="dimmed">{charge.code?.coding?.[0]?.display}</Text>
              </div>
              <Text fw={500}>
                ${(charge.priceOverride?.value || 0).toFixed(2)}
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
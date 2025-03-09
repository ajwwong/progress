import { Button, Group, Stack, Text, Alert, Card, Badge, TextInput, Select } from '@mantine/core';
import { Organization } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { IconEdit, IconX, IconCheck } from '@tabler/icons-react';

interface ExtensionEditorProps {
  organization: Organization;
  onSave: (updatedOrg: Organization) => Promise<void>;
}

// List of all subscription extensions
const SUBSCRIPTION_EXTENSIONS = [
  {
    name: 'Status',
    url: 'http://example.com/fhir/StructureDefinition/subscription-status',
    options: ['active', 'pending', 'cancelled', 'trialing', 'free']
  },
  {
    name: 'Plan',
    url: 'http://example.com/fhir/StructureDefinition/subscription-plan',
    options: [
      'free',
      'standard-30',
      'standard-45',
      'standard-60',
      'standard-80',
      'standard-100',
      'standard-120',
      'standard-150',
      'standard-200',
      'standard-300',
      'standard-400',
      'standard-500'
    ]
  },
  {
    name: 'Subscription ID',
    url: 'http://example.com/fhir/StructureDefinition/subscription-id',
  },
  {
    name: 'Period End',
    url: 'http://example.com/fhir/StructureDefinition/subscription-period-end',
    type: 'datetime'
  },
  {
    name: 'Sessions Used',
    url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-used',
    type: 'integer'
  },
  {
    name: 'Sessions Limit',
    url: 'http://example.com/fhir/StructureDefinition/subscription-sessions-allowed',
    type: 'integer'
  },
  {
    name: 'Last Reset Date',
    url: 'http://example.com/fhir/StructureDefinition/session-last-reset',
    type: 'datetime'
  },
  {
    name: 'Price',
    url: 'http://example.com/fhir/StructureDefinition/subscription-price',
    type: 'money'
  },
  {
    name: 'Billing Cycle',
    url: 'http://example.com/fhir/StructureDefinition/subscription-billing-cycle',
    options: ['monthly']
  }
];

export function ExtensionEditor({ organization, onSave }: ExtensionEditorProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Initialize edit values from organization extensions
    const values: Record<string, string> = {};
    SUBSCRIPTION_EXTENSIONS.forEach(ext => {
      const extension = organization.extension?.find(e => e.url === ext.url);
      values[ext.url] = extension?.valueString || 
                       extension?.valueDateTime || 
                       extension?.valueInteger?.toString() || 
                       extension?.valueMoney?.value?.toString() || 
                       '';
    });
    setEditValues(values);
  }, [organization, isEditing]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(undefined);

      // Filter out non-subscription extensions
      const otherExtensions = (organization.extension || []).filter(
        e => !e.url.startsWith('http://example.com/fhir/StructureDefinition/subscription-')
      );

      // Create new subscription extensions
      const subscriptionExtensions = SUBSCRIPTION_EXTENSIONS.map(ext => {
        const value = editValues[ext.url];
        if (!value) return null;

        switch (ext.type) {
          case 'datetime':
            return { url: ext.url, valueDateTime: value };
          case 'integer':
            return { url: ext.url, valueInteger: parseInt(value) };
          case 'money':
            return { url: ext.url, valueMoney: { value: parseFloat(value), currency: 'USD' } };
          default:
            return { url: ext.url, valueString: value };
        }
      }).filter(Boolean);

      // Update organization
      const updatedOrg = {
        ...organization,
        extension: [...otherExtensions, ...subscriptionExtensions]
      };

      await onSave(updatedOrg as Organization);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <Text fw={500} size="lg">Subscription Details</Text>
            <Button 
              variant="subtle" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Group gap={4}>
                <IconEdit size="1rem" />
                <span>Edit</span>
              </Group>
            </Button>
          </Group>
          {SUBSCRIPTION_EXTENSIONS.map((ext) => {
            const extension = organization.extension?.find(e => e.url === ext.url);
            let value = extension?.valueString || 
                       extension?.valueDateTime || 
                       extension?.valueInteger?.toString() || 
                       (extension?.valueMoney?.value && `$${extension.valueMoney.value}`);
            
            if (!value) return null;

            return (
              <Group key={ext.url}>
                <Text fw={500}>{ext.name}:</Text>
                {ext.name === 'Status' ? (
                  <Badge 
                    color={value === 'active' ? 'green' : 
                           value === 'pending' ? 'yellow' : 'red'}
                  >
                    {value}
                  </Badge>
                ) : (
                  <Text>{ext.type === 'datetime' ? new Date(value).toLocaleString() : value}</Text>
                )}
              </Group>
            );
          })}
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={500} size="lg">Edit Subscription Details</Text>
          <Group gap={8}>
            <Button 
              variant="subtle" 
              color="red"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <Group gap={4}>
                <IconX size="1rem" />
                <span>Cancel</span>
              </Group>
            </Button>
            <Button 
              variant="light"
              size="sm"
              onClick={handleSave}
              loading={saving}
            >
              <Group gap={4}>
                <IconCheck size="1rem" />
                <span>Save</span>
              </Group>
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {SUBSCRIPTION_EXTENSIONS.map((ext) => (
          <div key={ext.url}>
            <Text size="sm" fw={500} mb={4}>{ext.name}</Text>
            {ext.options ? (
              <Select
                value={editValues[ext.url]}
                onChange={(value: string | null) => setEditValues(prev => ({ ...prev, [ext.url]: value || '' }))}
                data={ext.options.map(opt => ({ value: opt, label: opt }))}
                clearable
              />
            ) : ext.type === 'datetime' ? (
              <TextInput
                type="datetime-local"
                value={editValues[ext.url]?.slice(0, 16) || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditValues(prev => ({ ...prev, [ext.url]: new Date(e.target.value).toISOString() }))
                }
              />
            ) : (
              <TextInput
                value={editValues[ext.url]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditValues(prev => ({ ...prev, [ext.url]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </Stack>
    </Card>
  );
}

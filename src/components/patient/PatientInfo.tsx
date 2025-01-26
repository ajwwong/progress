import { Paper, Stack, Group, Text, Button, TextInput, Select, ActionIcon, Box, Divider } from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconPhone, IconMail, IconCalendar, IconTemplate } from '@tabler/icons-react';
import { Patient } from '@medplum/fhirtypes';
import { usePatientInfo } from '../../hooks/usePatientInfo';
import { format } from 'date-fns';
import { useTemplates } from '../templates/hooks/useTemplates';
import { DefaultTemplateSelector } from '../templates/components/DefaultTemplateSelector';

interface PatientInfoProps {
  patient: Patient;
}

export function PatientInfo({ patient }: PatientInfoProps): JSX.Element {
  const {
    isEditing,
    formData,
    startEditing,
    cancelEditing,
    updateField,
    saveChanges
  } = usePatientInfo(patient);

  const { templates, loading } = useTemplates();

  const pronounOptions = [
    { value: 'he-him', label: 'He/Him' },
    { value: 'she-her', label: 'She/Her' },
    { value: 'they-them', label: 'They/Them' },
    { value: 'other', label: 'Other' }
  ];

  // Convert templates to dropdown options
  const templateOptions = templates
    .filter(template => template.id) // Filter out templates without IDs
    .map(template => ({
      value: template.id!, // Non-null assertion since we filtered for templates with IDs
      label: template.name || `Template ${template.id}`
    }));

  if (isEditing) {
    return (
      <Paper withBorder p="xl">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={500} size="lg">Client Information</Text>
            <Group>
              <ActionIcon 
                variant="light" 
                color="green" 
                onClick={saveChanges}
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon 
                variant="light" 
                color="red" 
                onClick={cancelEditing}
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>
          </Group>

          <Group grow>
            <TextInput
              label="First Name"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
            <TextInput
              label="Last Name"
              value={formData.familyName}
              onChange={(e) => updateField('familyName', e.target.value)}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Phone"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <TextInput
              label="Email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Date of Birth"
              type="date"
              value={formData.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
            />
            <Select
              label="Pronouns"
              value={formData.pronouns}
              onChange={(value) => updateField('pronouns', value || '')}
              data={pronounOptions}
            />
          </Group>

          <Divider label="Documentation Preferences" labelPosition="center" />
          <DefaultTemplateSelector patient={patient} />
        </Stack>
      </Paper>
    );
  }

  // Find the selected template name for display
  const selectedTemplateName = templates.find(t => t.id === formData.defaultTemplate)?.name;

  return (
    <Paper withBorder p="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={500} size="lg">Client Information</Text>
          <Button 
            variant="light" 
            leftSection={<IconEdit size={16} />}
            onClick={startEditing}
          >
            Edit
          </Button>
        </Group>

        <Group>
          <Text fw={500}>Name:</Text>
          <Text>{formData.firstName} {formData.familyName}</Text>
        </Group>

        <Group>
          <Text fw={500}>Phone:</Text>
          <Group gap="xs">
            <IconPhone size={16} />
            <Text>{formData.phone || 'Not provided'}</Text>
          </Group>
        </Group>

        <Group>
          <Text fw={500}>Email:</Text>
          <Group gap="xs">
            <IconMail size={16} />
            <Text>{formData.email || 'Not provided'}</Text>
          </Group>
        </Group>

        <Group>
          <Text fw={500}>Date of Birth:</Text>
          <Group gap="xs">
            <IconCalendar size={16} />
            <Text>
              {formData.birthDate ? format(new Date(formData.birthDate), 'MMMM d, yyyy') : 'Not provided'}
            </Text>
          </Group>
        </Group>

        <Group>
          <Text fw={500}>Pronouns:</Text>
          <Text>{formData.pronouns || 'Not specified'}</Text>
        </Group>

        <Divider label="Documentation Preferences" labelPosition="center" />
        <DefaultTemplateSelector patient={patient} />
      </Stack>
    </Paper>
  );
} 
import { Paper, Stack, Group, Text, Button, TextInput, Select, ActionIcon, Box } from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconPhone, IconMail, IconCalendar, IconTemplate } from '@tabler/icons-react';
import { Patient } from '@medplum/fhirtypes';
import { usePatientInfo } from '../../hooks/usePatientInfo';
import { format } from 'date-fns';
import { useTemplates } from '../templates/hooks/useTemplates';

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

          <Box>
            <Text size="sm" fw={500} c="dimmed" mb="xs">Documentation Preferences</Text>
            <Select
              placeholder="Select default template"
              value={formData.defaultTemplate}
              onChange={(value) => updateField('defaultTemplate', value || '')}
              data={templateOptions}
            />
          </Box>
        </Stack>
      </Paper>
    );
  }

  // Find the selected template name for display
  const selectedTemplateName = templates.find(t => t.id === formData.defaultTemplate)?.name;

  return (
    <Paper withBorder p="xl">
      <Stack gap="lg">
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="lg">Client Information</Text>
          <Button 
            variant="light" 
            size="sm"
            leftSection={<IconEdit size={16} />}
            onClick={startEditing}
          >
            Edit
          </Button>
        </Group>

        {/* Contact Information */}
        <Box>
          <Text size="sm" fw={500} c="dimmed" mb={8}>Contact Information</Text>
          <Stack gap={8}>
            <Group gap="xs" wrap="nowrap">
              <IconPhone size={16} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
              <Text size="sm" c={formData.phone ? undefined : "dimmed"} style={{ wordBreak: 'break-word' }}>
                {formData.phone || 'No phone number'}
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <IconMail size={16} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
              <Text size="sm" c={formData.email ? undefined : "dimmed"} style={{ wordBreak: 'break-word' }}>
                {formData.email || 'No email address'}
              </Text>
            </Group>
          </Stack>
        </Box>

        {/* Demographics */}
        <Box>
          <Text size="sm" fw={500} c="dimmed" mb={8}>Demographics</Text>
          <Stack gap={8}>
            <Group gap="xs" wrap="nowrap">
              <IconCalendar size={16} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
              <Text size="sm" c={formData.birthDate ? undefined : "dimmed"}>
                {formData.birthDate ? format(new Date(formData.birthDate), 'MMMM d, yyyy') : 'No birth date'}
              </Text>
            </Group>
            <Text size="sm" c={formData.pronouns ? undefined : "dimmed"} ml={24}>
              {pronounOptions.find(p => p.value === formData.pronouns)?.label || 'No pronouns specified'}
            </Text>
          </Stack>
        </Box>

        {/* Documentation Preferences */}
        <Box>
          <Text size="sm" fw={500} c="dimmed" mb={8}>Documentation Preferences</Text>
          <Group gap="xs" wrap="nowrap">
            <IconTemplate size={16} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
            <Text size="sm" c={selectedTemplateName ? undefined : "dimmed"}>
              {selectedTemplateName || 'No default template'}
            </Text>
          </Group>
        </Box>
      </Stack>
    </Paper>
  );
} 
import { Select, Button, Group, Text } from '@mantine/core';
import { Patient } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { showNotification } from '@mantine/notifications';

interface DefaultTemplateSelectorProps {
  patient: Patient;
}

export function DefaultTemplateSelector({ patient }: DefaultTemplateSelectorProps): JSX.Element {
  const { templates, getPatientDefaultTemplate, setPatientDefaultTemplate } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDefaultTemplate();
  }, [patient]);

  const loadDefaultTemplate = async () => {
    try {
      setLoading(true);
      const template = await getPatientDefaultTemplate(patient.id!);
      setSelectedTemplateId(template?.id);
    } catch (error) {
      console.error('Error loading default template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await setPatientDefaultTemplate(patient.id!, selectedTemplateId || '');
      showNotification({
        title: 'Success',
        message: 'Default template updated',
        color: 'green'
      });
    } catch (error) {
      console.error('Error setting default template:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to update default template',
        color: 'red'
      });
    }
  };

  return (
    <Group align="flex-end">
      <Select
        label="Default Note Template"
        placeholder="Select a default template"
        data={templates
          .filter(t => t.type === 'progress')
          .map(t => ({
            value: t.id!,
            label: t.name
          }))}
        value={selectedTemplateId}
        onChange={(value: string | null) => setSelectedTemplateId(value || undefined)}
        style={{ minWidth: '300px' }}
        disabled={loading}
      />
      <Button 
        onClick={handleSave}
        disabled={loading}
      >
        Save Default
      </Button>
    </Group>
  );
} 

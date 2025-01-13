import { Title, Stack, Paper, Group, Badge, Button, Text } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes';
import { useEffect, useState } from 'react';
import { IconClipboardCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function ClientForms() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const navigate = useNavigate();
  const [forms, setForms] = useState<Questionnaire[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);

  useEffect(() => {
    // Load all questionnaires marked for client portal
    medplum.searchResources('Questionnaire', 'context=client-portal').then(setForms);
    
    // Load patient's responses
    if (profile.id) {
      medplum.searchResources('QuestionnaireResponse', `subject=${profile.id}`).then(setResponses);
    }
  }, [medplum, profile.id]);

  const getFormStatus = (formId: string) => {
    const response = responses.find(r => r.questionnaire === `Questionnaire/${formId}`);
    return response ? 'completed' : 'pending';
  };

  return (
    <Stack spacing="lg">
      <Title order={2}>Required Forms</Title>

      {forms.map((form) => (
        <Paper key={form.id} p="md" withBorder>
          <Group position="apart">
            <div>
              <Group spacing="xs">
                <Text fw={500}>{form.title}</Text>
                <Badge 
                  color={getFormStatus(form.id as string) === 'completed' ? 'green' : 'yellow'}
                >
                  {getFormStatus(form.id as string)}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                {form.description}
              </Text>
            </div>
            <Button
              variant="light"
              leftIcon={<IconClipboardCheck size={16} />}
              onClick={() => navigate(`/portal/forms/${form.id}`)}
            >
              {getFormStatus(form.id as string) === 'completed' ? 'Review' : 'Complete Form'}
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
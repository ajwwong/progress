import { Title, Paper, Stack, Button, Group, TextInput, Textarea, Radio, Checkbox, Text } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Patient, Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function FormRenderer() {
  const { formId } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  const navigate = useNavigate();
  const [form, setForm] = useState<Questionnaire>();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (formId) {
      medplum.readResource('Questionnaire', formId).then(setForm).finally(() => setLoading(false));
    }
  }, [medplum, formId]);

  const handleSubmit = async () => {
    if (!form || !profile.id) return;

    try {
      const response: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        questionnaire: `Questionnaire/${form.id}`,
        status: 'completed',
        subject: { reference: `Patient/${profile.id}` },
        authored: new Date().toISOString(),
        item: Object.entries(answers).map(([linkId, answer]) => ({
          linkId,
          answer: [{ valueString: answer }]
        }))
      };

      await medplum.createResource(response);
      navigate('/portal/forms');
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (loading) return <Text>Loading...</Text>;
  if (!form) return <Text>Form not found</Text>;

  return (
    <Stack spacing="lg">
      <Title order={2}>{form.title}</Title>
      <Text c="dimmed">{form.description}</Text>

      <Paper p="xl" withBorder>
        <Stack spacing="xl">
          {form.item?.map((item) => (
            <Stack key={item.linkId} spacing="xs">
              <Text fw={500}>{item.text}</Text>
              {item.type === 'string' && (
                <TextInput
                  value={answers[item.linkId] || ''}
                  onChange={(e) => setAnswers(prev => ({ 
                    ...prev, 
                    [item.linkId]: e.target.value 
                  }))}
                />
              )}
              {item.type === 'text' && (
                <Textarea
                  value={answers[item.linkId] || ''}
                  onChange={(e) => setAnswers(prev => ({ 
                    ...prev, 
                    [item.linkId]: e.target.value 
                  }))}
                  minRows={3}
                />
              )}
              {item.type === 'choice' && (
                <Radio.Group
                  value={answers[item.linkId] || ''}
                  onChange={(value) => setAnswers(prev => ({ 
                    ...prev, 
                    [item.linkId]: value 
                  }))}
                >
                  {item.answerOption?.map((option) => (
                    <Radio
                      key={option.valueCoding?.code}
                      value={option.valueCoding?.code || ''}
                      label={option.valueCoding?.display}
                    />
                  ))}
                </Radio.Group>
              )}
              {item.type === 'boolean' && (
                <Checkbox
                  checked={answers[item.linkId] || false}
                  onChange={(e) => setAnswers(prev => ({ 
                    ...prev, 
                    [item.linkId]: e.target.checked 
                  }))}
                  label={item.text}
                />
              )}
            </Stack>
          ))}

          <Group position="right" mt="xl">
            <Button variant="light" onClick={() => navigate('/portal/forms')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Form</Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
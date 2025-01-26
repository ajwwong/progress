import { Container, Title, Stack, Select, Radio, MultiSelect, Button, Paper } from '@mantine/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Practitioner } from '@medplum/fhirtypes';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';

export function OnboardingPage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    specialty: '',
    referencePreference: 'patient',
    quotePreference: 'exclude',
    selectedInterventions: [] as string[],
  });

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!profile) {
      navigate('/signin');
    }
  }, [profile, navigate]);

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const updatedPractitioner = {
        ...profile,
        extension: [
          ...(profile.extension?.filter(e => 
            e.url !== 'https://progress.care/fhir/reference-preference' && 
            e.url !== 'https://progress.care/fhir/quote-preference' &&
            e.url !== 'https://progress.care/fhir/interventions'
          ) || []),
          {
            url: 'https://progress.care/fhir/reference-preference',
            valueString: formData.referencePreference
          },
          {
            url: 'https://progress.care/fhir/quote-preference',
            valueString: formData.quotePreference
          },
          {
            url: 'https://progress.care/fhir/interventions',
            valueString: JSON.stringify(formData.selectedInterventions)
          }
        ]
      };

      await medplum.updateResource(updatedPractitioner);
      showNotification({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Profile updated successfully'
      });
      navigate('/dashboard');
    } catch (err) {
      showNotification({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: 'Failed to update profile'
      });
    }
    setLoading(false);
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="xs" p="xl">
        <Stack style={{ gap: '1.5rem' }}>
          <Title order={2}>Complete Your Profile</Title>
          
          <Select
            label="Specialty"
            description="Select your primary area of practice"
            placeholder="Select your specialty"
            data={[
              'Primary Care',
              'Cardiology',
              'Dermatology',
              'Pediatrics',
              'Psychiatry',
              'Psychology',
              'Social Work',
              'Other'
            ]}
            value={formData.specialty}
            onChange={(value) => setFormData({ ...formData, specialty: value || '' })}
            required
          />
          
          <Radio.Group
            label="Reference Preference"
            description="Choose how you prefer to refer to the people you work with"
            value={formData.referencePreference}
            onChange={(value) => setFormData({ ...formData, referencePreference: value })}
          >
            <Radio value="patient" label="Patient" />
            <Radio value="client" label="Client" />
          </Radio.Group>
          
          <Radio.Group
            label="Quote Preference"
            description="Choose whether to include direct quotes in notes"
            value={formData.quotePreference}
            onChange={(value) => setFormData({ ...formData, quotePreference: value })}
          >
            <Radio value="include" label="Include Quotes" />
            <Radio value="exclude" label="Exclude Quotes" />
          </Radio.Group>

          <MultiSelect
            label="Interventions"
            description="Select the interventions you commonly use"
            data={[
              'Cognitive Behavioral Therapy',
              'Mindfulness',
              'Exposure Therapy',
              'Group Therapy',
              'Family Therapy',
              'Psychodynamic Therapy',
              'Solution-Focused Therapy',
              'Motivational Interviewing'
            ]}
            value={formData.selectedInterventions}
            onChange={(value) => setFormData({ ...formData, selectedInterventions: value })}
            placeholder="Select interventions"
          />

          <Button 
            onClick={handleProfileUpdate}
            loading={loading}
            size="lg"
          >
            Complete Setup
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

export default OnboardingPage; 

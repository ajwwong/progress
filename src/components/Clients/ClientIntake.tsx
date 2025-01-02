import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Checkbox,
  Avatar,
  Badge,
  List,
  Anchor,
  Stepper,
  ThemeIcon,
  TextInput,
  Textarea,
  Divider,
  Select,
  Timeline
} from '@mantine/core';
import { Check, FileText, Mail, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function ClientIntake() {
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { clientName, clientEmail } = location.state || {};
  const [emailSubject, setEmailSubject] = useState(`Welcome to ${clientName}'s Client Portal`);
  const [emailTemplate, setEmailTemplate] = useState('default');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    'HIPAA Notice of Privacy Practices',
    'Informed Consent for Psychotherapy'
  ]);
  const [emailMessage, setEmailMessage] = useState(`Dear ${clientName},

Thank you for choosing our practice. To get started, please complete the following forms through our secure client portal:

• HIPAA Notice of Privacy Practices
• Informed Consent for Psychotherapy
• Intake Questionnaire

These forms help us better understand your needs and ensure we can provide the best possible care. Please complete them before your first appointment.

If you have any questions, don't hesitate to reach out.

Best regards,
Dr. Sarah Wilson`);

  const consentDocuments = [
    'Adolescent Informed Consent Form',
    'HIPAA Notice of Privacy Practices',
    'Informed Consent Coaching Agreement – for Clients',
    'Informed Consent for Consultation – for Therapists',
    'Informed Consent for Psychotherapy',
    'Informed Consent for Teleconsultation',
    'Informed Consent for Telehealth',
    'Parents of Adolescent Informed Consent Form',
    'Practice Location, Gate Code, and Parking',
    'Practice Policies',
    'Special Confidentiality Notice for Parents'
  ];

  const questionnaires = [
    'Adolescent Intake Questionnaire',
    'Adolescent Intake Questionnaire (Parents)',
    'Release of Information'
  ];

  const handleDocumentSelect = (doc: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs([...selectedDocs, doc]);
    } else {
      setSelectedDocs(selectedDocs.filter(d => d !== doc));
    }
  };

  const handleSendIntake = () => {
    // Here you would implement the actual sending logic
    navigate(`/patients/${encodeURIComponent(clientName)}`, {
      state: { showSuccessMessage: true }
    });
  };

  if (!clientName || !clientEmail) {
    return (
      <Container size="xl" py="xl">
        <Text>Invalid client information. Please create a client first.</Text>
        <Button onClick={() => navigate('/clients')} mt="md">
          Return to Clients
        </Button>
      </Container>
    );
  }

  const renderStep = () => {
    switch (active) {
      case 0:
        return (
          <>
            <Paper withBorder p="md" bg="yellow.0">
              <Group>
                <ThemeIcon color="yellow" variant="light">
                  <Check size={16} />
                </ThemeIcon>
                <Text>{clientName} will receive Client Portal access.</Text>
              </Group>
            </Paper>

            <Paper withBorder p="md">
              <Group>
                <Avatar size="md" radius="xl">{clientName.charAt(0)}</Avatar>
                <Stack gap={0}>
                  <Text>{clientName}</Text>
                  <Text size="sm" c="dimmed">{clientEmail}</Text>
                </Stack>
              </Group>
            </Paper>

            <Paper withBorder p="xl">
              <Stack gap="xl">
                <Title order={4}>{clientName}'s items</Title>

                <Stack gap="md">
                  <Text fw={500}>Consent Documents</Text>
                  <Stack gap="xs">
                    {consentDocuments.map((doc) => (
                      <Group key={doc}>
                        <Checkbox 
                          label={doc}
                          checked={selectedDocs.includes(doc)}
                          onChange={(e) => handleDocumentSelect(doc, e.currentTarget.checked)}
                        />
                      </Group>
                    ))}
                  </Stack>
                </Stack>

                <Stack gap="md">
                  <Group position="apart">
                    <Text fw={500}>Scored measures</Text>
                    <Anchor size="sm">Add from library</Anchor>
                  </Group>
                  <Text size="sm" c="dimmed">Auto-scored PHQ-9 and GAD-7 available.</Text>
                </Stack>

                <Stack gap="md">
                  <Text fw={500}>Questionnaires</Text>
                  <Stack gap="xs">
                    {questionnaires.map((doc) => (
                      <Group key={doc}>
                        <Checkbox 
                          label={doc}
                          checked={selectedDocs.includes(doc)}
                          onChange={(e) => handleDocumentSelect(doc, e.currentTarget.checked)}
                        />
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Stack>
            </Paper>

            <Group position="apart">
              <Button variant="subtle" onClick={() => navigate('/clients')}>
                Cancel
              </Button>
              <Button onClick={() => setActive((current) => current + 1)}>
                Continue to Email
              </Button>
            </Group>
          </>
        );

      case 1:
        return (
          <>
            <Paper withBorder p="xl">
              <Stack gap="xl">
                <Stack gap="md">
                  <Group position="apart">
                    <Group>
                      <ThemeIcon size="lg" variant="light" color="blue">
                        <Mail size={18} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={500}>Email Composition</Text>
                        <Text size="sm" c="dimmed">Customize the message sent to {clientName}</Text>
                      </Stack>
                    </Group>
                    <Select
                      placeholder="Select template"
                      value={emailTemplate}
                      onChange={(value) => setEmailTemplate(value || 'default')}
                      data={[
                        { value: 'default', label: 'Default Welcome' },
                        { value: 'brief', label: 'Brief Introduction' },
                        { value: 'detailed', label: 'Detailed Instructions' }
                      ]}
                      w={200}
                    />
                  </Group>

                  <Divider />

                  <TextInput
                    label="To"
                    value={clientEmail}
                    readOnly
                  />

                  <TextInput
                    label="Subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.currentTarget.value)}
                  />

                  <Textarea
                    label="Message"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.currentTarget.value)}
                    minRows={10}
                    autosize
                  />
                </Stack>
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Group>
                <ThemeIcon size="lg" variant="light" color="yellow">
                  <FileText size={18} />
                </ThemeIcon>
                <Text size="sm">Selected forms will be automatically attached and accessible through the client portal.</Text>
              </Group>
            </Paper>

            <Group position="apart">
              <Button 
                variant="subtle" 
                onClick={() => setActive((current) => current - 1)}
                leftSection={<ArrowLeft size={16} />}
              >
                Back
              </Button>
              <Button 
                onClick={() => setActive((current) => current + 1)}
                rightSection={<Send size={16} />}
              >
                Review & Send
              </Button>
            </Group>
          </>
        );

      case 2:
        return (
          <>
            <Paper withBorder p="xl">
              <Stack gap="xl">
                <Group>
                  <ThemeIcon size="lg" variant="light" color="blue">
                    <FileText size={18} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text fw={500}>Review & Send</Text>
                    <Text size="sm" c="dimmed">Please review the details before sending</Text>
                  </Stack>
                </Group>

                <Timeline active={1} bulletSize={24}>
                  <Timeline.Item 
                    bullet={<Mail size={16} />} 
                    title="Email Details"
                  >
                    <Stack gap="xs" mt="xs">
                      <Group>
                        <Text size="sm" fw={500}>To:</Text>
                        <Text size="sm">{clientEmail}</Text>
                      </Group>
                      <Group>
                        <Text size="sm" fw={500}>Subject:</Text>
                        <Text size="sm">{emailSubject}</Text>
                      </Group>
                      <Text size="sm" fw={500}>Message Preview:</Text>
                      <Paper withBorder p="sm" bg="gray.0">
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {emailMessage.length > 200 
                            ? emailMessage.substring(0, 200) + '...' 
                            : emailMessage}
                        </Text>
                      </Paper>
                    </Stack>
                  </Timeline.Item>

                  <Timeline.Item 
                    bullet={<FileText size={16} />} 
                    title="Selected Forms"
                  >
                    <Stack gap="xs" mt="xs">
                      {selectedDocs.length > 0 ? (
                        selectedDocs.map((doc, index) => (
                          <Group key={index}>
                            <Check size={14} />
                            <Text size="sm">{doc}</Text>
                          </Group>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed">No forms selected</Text>
                      )}
                    </Stack>
                  </Timeline.Item>

                  <Timeline.Item 
                    bullet={<AlertCircle size={16} />} 
                    title="Portal Access"
                  >
                    <Text size="sm" mt="xs">
                      {clientName} will receive an email with instructions to access the client portal
                    </Text>
                  </Timeline.Item>
                </Timeline>

                <Paper withBorder p="md" bg="blue.0">
                  <Group>
                    <ThemeIcon color="blue" variant="light">
                      <Check size={16} />
                    </ThemeIcon>
                    <Text size="sm">
                      Once sent, you'll be able to track form completion in {clientName}'s profile
                    </Text>
                  </Group>
                </Paper>
              </Stack>
            </Paper>

            <Group position="apart" mt="xl">
              <Button 
                variant="subtle" 
                onClick={() => setActive((current) => current - 1)}
                leftSection={<ArrowLeft size={16} />}
              >
                Back
              </Button>
              <Button 
                onClick={handleSendIntake}
                rightSection={<Send size={16} />}
                color="blue"
              >
                Send Intake Forms
              </Button>
            </Group>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Title order={2}>Send intakes for {clientName}</Title>

        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step
            label="Client Info"
            description="Review client details"
            icon={<FileText size={18} />}
          />
          <Stepper.Step
            label="Compose Email"
            description="Customize message"
            icon={<Mail size={18} />}
          />
          <Stepper.Step
            label="Review & Send"
            description="Final check"
            icon={<Send size={18} />}
          />
        </Stepper>

        {renderStep()}
      </Stack>
    </Container>
  );
}
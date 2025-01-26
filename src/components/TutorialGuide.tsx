import { Spotlight, SpotlightActionData } from '@mantine/spotlight';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Text, Stack } from '@mantine/core';
import { IconCalendar, IconUser, IconMicrophone, IconTemplate, IconSettings } from '@tabler/icons-react';

interface TutorialStep {
  target: string;
  title: string;
  description: string;
  placement?: 'start' | 'center' | 'end';
  route?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    target: '[data-tutorial="calendar"]',
    title: 'Calendar',
    description: 'View and manage your appointments. Click to schedule new sessions or view your daily schedule.',
    route: '/calendar'
  },
  {
    target: '[data-tutorial="patients"]',
    title: 'Patient Directory',
    description: 'Access your patient list, add new patients, and view patient profiles.',
    route: '/patient'
  },
  {
    target: '[data-tutorial="audio"]',
    title: 'Audio Transcription',
    description: 'Record and transcribe your session notes using our AI-powered transcription service.',
    route: '/audio'
  },
  {
    target: '[data-tutorial="templates"]',
    title: 'Note Templates',
    description: 'Create and manage templates for your clinical notes to save time and maintain consistency.',
    route: '/templates'
  },
  {
    target: '[data-tutorial="settings"]',
    title: 'Settings',
    description: 'Customize your preferences, manage your profile, and configure your account settings.',
    route: '/settings'
  }
];

export function TutorialGuide() {
  const [opened, setOpened] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  // Check if this is the first time user is visiting
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setOpened(true);
    }
  }, []);

  const handleStepComplete = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (tutorialSteps[currentStep].route) {
        navigate(tutorialSteps[currentStep].route);
      }
    } else {
      setOpened(false);
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  };

  const actions: SpotlightActionData[] = [
    {
      id: 'tutorial-step',
      label: (
        <Stack spacing="xs">
          <Text size="lg" weight={500}>
            {tutorialSteps[currentStep]?.title}
          </Text>
          <Text size="sm" color="dimmed">
            {tutorialSteps[currentStep]?.description}
          </Text>
          <Button onClick={handleStepComplete} mt="md">
            {currentStep === tutorialSteps.length - 1 ? 'Finish Tutorial' : 'Next Step'}
          </Button>
        </Stack>
      ),
      description: '',
      onClick: () => null,
    },
  ];

  return (
    <>
      <Spotlight
        actions={actions}
        opened={opened}
        onClose={() => setOpened(false)}
        searchProps={{
          placeholder: 'Tutorial Guide',
          disabled: true,
        }}
        highlightQuery={false}
        radius="md"
        size="lg"
        target={tutorialSteps[currentStep]?.target}
      />

      <Button 
        onClick={() => {
          setCurrentStep(0);
          setOpened(true);
        }}
        variant="light"
      >
        Start Tutorial
      </Button>
    </>
  );
}

export default TutorialGuide; 
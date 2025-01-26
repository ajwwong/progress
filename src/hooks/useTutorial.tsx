import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Text, Stack, Title } from '@mantine/core';

interface TutorialStep {
  title: string;
  description: string;
  route?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Progress Care',
    description: 'Let\'s take a quick tour of the main features to help you get started.',
    route: undefined
  },
  {
    title: 'Calendar',
    description: 'View and manage your appointments. Schedule new sessions or view your daily schedule.',
    route: '/calendar'
  },
  {
    title: 'Patient Directory',
    description: 'Access your patient list, add new patients, and view detailed patient profiles.',
    route: '/patient'
  },
  {
    title: 'Audio Transcription',
    description: 'Record and transcribe your session notes using our AI-powered transcription service.',
    route: '/audio'
  },
  {
    title: 'Note Templates',
    description: 'Create and manage templates for your clinical notes to save time and maintain consistency.',
    route: '/templates'
  },
  {
    title: 'Settings',
    description: 'Customize your preferences, manage your profile, and configure your account settings.',
    route: '/settings'
  }
];

export function useTutorial() {
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

  const handleNext = () => {
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

  const handleSkip = () => {
    setOpened(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const startTutorial = () => {
    setCurrentStep(0);
    setOpened(true);
  };

  const TutorialModal = () => (
    <Modal
      opened={opened}
      onClose={handleSkip}
      title="Tutorial Guide"
      size="lg"
      radius="md"
      centered
    >
      <Stack>
        <Title order={4}>{tutorialSteps[currentStep]?.title}</Title>
        <Text>{tutorialSteps[currentStep]?.description}</Text>
        <Stack mt="xl">
          <Button onClick={handleNext} fullWidth>
            {currentStep === tutorialSteps.length - 1 ? 'Finish Tutorial' : 'Next Step'}
          </Button>
          {currentStep < tutorialSteps.length - 1 && (
            <Button variant="light" onClick={handleSkip} fullWidth>
              Skip Tutorial
            </Button>
          )}
        </Stack>
      </Stack>
    </Modal>
  );

  return {
    TutorialModal,
    startTutorial
  };
}

export default useTutorial; 
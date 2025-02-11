import { Button, Center, Stack, TextInput, Text } from '@mantine/core';
import { LoginAuthenticationResponse, normalizeOperationOutcome } from '@medplum/core';
import { OperationOutcome } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useState } from 'react';

interface CustomNewProjectFormProps {
  login: string;
  handleAuthResponse: (response: LoginAuthenticationResponse) => void;
}

export function CustomNewProjectForm(props: CustomNewProjectFormProps): JSX.Element {
  const medplum = useMedplum();
  const [outcome, setOutcome] = useState<OperationOutcome>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await medplum.startNewProject({
        login: props.login,
        projectName: formData.get('projectName') as string,
      });
      
      props.handleAuthResponse(response);
    } catch (err) {
      setOutcome(normalizeOperationOutcome(err));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Center>
        <h2>Create Project</h2>
      </Center>
      
      {outcome && <Text color="red">{JSON.stringify(outcome)}</Text>}
      
      <Stack gap="md">
        <TextInput
          name="projectName"
          label="Project Name"
          required
          placeholder="Enter project name"
        />
        
        <Button type="submit" fullWidth>
          Create Project
        </Button>
      </Stack>
    </form>
  );
}

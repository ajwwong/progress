import { Box, Paper } from '@mantine/core';
import { LoginAuthenticationResponse, normalizeOperationOutcome } from '@medplum/core';
import { OperationOutcome } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { CustomNewUserForm } from './CustomNewUserForm';
import { CustomNewProjectForm } from './CustomNewProjectForm';

export interface RegisterFormProps {
  type: 'patient' | 'project';
  projectId: string;
  clientId?: string;
  googleClientId?: string;
  recaptchaSiteKey?: string;
  onSuccess: () => void;
}

export function CustomRegisterForm(props: RegisterFormProps): JSX.Element {
  const { type, projectId, clientId, recaptchaSiteKey, onSuccess } = props;
  const medplum = useMedplum();
  const [login, setLogin] = useState<string>();
  const [outcome, setOutcome] = useState<OperationOutcome>();

  useEffect(() => {
    if (type === 'patient' && login) {
      medplum
        .startNewPatient({ login, projectId })
        .then((response) => medplum.processCode(response.code as string))
        .then(() => onSuccess())
        .catch((err) => setOutcome(normalizeOperationOutcome(err)));
    }
  }, [medplum, type, projectId, login, onSuccess]);

  const handleAuthResponse = (response: LoginAuthenticationResponse): void => {
    if (response.code) {
      medplum
        .processCode(response.code)
        .then(() => onSuccess())
        .catch(console.log);
    } else if (response.login) {
      setLogin(response.login);
    }
  };

  return (
    <Box>
      {!login && (
        <CustomNewUserForm
          projectId={projectId}
          clientId={clientId}
          recaptchaSiteKey={recaptchaSiteKey}
          handleAuthResponse={handleAuthResponse}
        />
      )}
      {login && type === 'project' && (
        <CustomNewProjectForm 
          login={login} 
          handleAuthResponse={handleAuthResponse} 
        />
      )}
    </Box>
  );
}

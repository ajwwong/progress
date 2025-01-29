import { BotEvent, MedplumClient } from '@medplum/core';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  try {
    const debugLog: any[] = [];
    debugLog.push('Bot started execution');

    // Check if required secrets exist
    if (!event.secrets['MEDPLUM_CLIENT_ID']?.valueString || 
        !event.secrets['MEDPLUM_CLIENT_SECRET']?.valueString || 
        !event.secrets['TEMPLATE_PROJECT_ID']?.valueString) {
      return {
        status: 'error',
        message: 'Missing required secrets',
        debugLog
      };
    }

    const superAdminClient = new MedplumClient({
      baseUrl: 'http://localhost:8103/',
      clientId: event.secrets['MEDPLUM_CLIENT_ID'].valueString,
      clientSecret: event.secrets['MEDPLUM_CLIENT_SECRET'].valueString
    });

    debugLog.push('MedplumClient created');

    await superAdminClient.startClientLogin(
      event.secrets['MEDPLUM_CLIENT_ID'].valueString,
      event.secrets['MEDPLUM_CLIENT_SECRET'].valueString
    );
    debugLog.push('Login successful');

    const sourceProjectId = event.secrets['TEMPLATE_PROJECT_ID'].valueString;
    
    // Get the source project details to get its name
    const sourceProject = await superAdminClient.readResource('Project', sourceProjectId);
    const timestamp = new Date().toLocaleString();
    const newProjectName = `${sourceProject.name} - Clone ${timestamp}`;
    
    debugLog.push(`Attempting to clone project: ${sourceProjectId} with name: ${newProjectName}`);

    try {
      debugLog.push('Attempting clone operation');
      
      const response = await fetch(`http://localhost:8103/fhir/R4/Project/${sourceProjectId}/$clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await superAdminClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        debugLog.push('Clone response not OK:', response.status, errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      debugLog.push('Clone operation completed');
      
      return {
        status: 'success',
        clonedProject: result,
        originalName: sourceProject.name,
        newName: newProjectName,
        debugLog
      };
    } catch (cloneError) {
      debugLog.push('Clone operation failed');
      debugLog.push(cloneError);
      
      return {
        status: 'error',
        message: 'Clone operation failed',
        details: cloneError,
        debugLog
      };
    }

  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Clone failed',
      details: error,
      debugLog: ['Unexpected error occurred', error]
    };
  }
}
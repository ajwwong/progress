import { BotEvent, MedplumClient } from '@medplum/core';
import { Project, Reference, ProjectMembership } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent<Project>): Promise<any> {
  try {
    const debugLog: any[] = [];
    debugLog.push('Bot started execution');
    console.log('Bot started execution with event:', event);

    // Get the newly created project ID and user info from the event
    const project = event.input;
    console.log('Project from event:', project);
    
    const newProjectId = project.id;
    const userId = project.owner?.reference;
    debugLog.push(`New project created with ID: ${newProjectId}`);
    debugLog.push(`User ID: ${userId}`);
    console.log(`Processing project ID: ${newProjectId}, User ID: ${userId}`);

    // Template/source project to clone FROM
    const sourceProjectId = event.secrets['TEMPLATE_PROJECT_ID']?.valueString;
    if (!sourceProjectId) {
      throw new Error('Template project ID not configured in secrets');
    }

    const superAdminClient = new MedplumClient({
      baseUrl: event.baseUrl,
      clientId: event.secrets['MEDPLUM_CLIENT_ID']?.valueString,
      clientSecret: event.secrets['MEDPLUM_CLIENT_SECRET']?.valueString
    });

    debugLog.push('MedplumClient created');
    console.log('Created superAdminClient');

    await superAdminClient.startClientLogin(
      'f8828fae-82a6-4958-89a9-d0239f149f58', 
      'c6045752c2ffebd06e2df7614dedaacac887dc8c2bb27210072dca37ccd89788'
    );
    debugLog.push('Login successful');
    console.log('SuperAdmin login successful');

    try {
      console.log('Starting clone operation...');
      // Clone resources INTO the new project
      const response = await fetch(`http://localhost:8103/fhir/R4/Project/${sourceProjectId}/$clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await superAdminClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'target',
              valueReference: {
                reference: `Project/${newProjectId}`
              }
            }
          ]
        })
      });

      console.log('Clone operation response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Clone operation failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      console.log('Clone operation result:', result);
      debugLog.push('Clone operation completed successfully');

      // Grant the user admin access to their new project
      if (userId) {
        console.log('Creating project membership for user:', userId);
        const membership: ProjectMembership = {
          resourceType: 'ProjectMembership',
          project: { reference: `Project/${newProjectId}` },
          user: { reference: userId },
          profile: { reference: userId },
          admin: true
        };

        const membershipResult = await superAdminClient.createResource(membership);
        console.log('Project membership created:', membershipResult);
        debugLog.push('User access granted to new project');
      }
      
      return {
        status: 'success',
        details: {
          sourceProjectId: sourceProjectId,
          targetProjectId: newProjectId,
          userId: userId,
          timestamp: new Date().toISOString()
        },
        fullDetails: result,
        debugLog
      };
    } catch (cloneError) {
      console.error('Clone operation error:', cloneError);
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
    console.error('Unexpected error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Clone failed',
      details: error,
      debugLog: ['Unexpected error occurred', error]
    };
  }
}
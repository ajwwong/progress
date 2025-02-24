import { BotEvent, MedplumClient } from '@medplum/core';
import { Organization } from '@medplum/fhirtypes';

interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  password: string;
}

export async function handler(medplum: MedplumClient, event: BotEvent<RegistrationInput>): Promise<any> {
  const debugLog: string[] = [];
  const log = (message: string) => {
    debugLog.push(message);
  };

  try {
    // Validate required secrets
    if (!event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_ID']?.valueString || 
        !event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_SECRET']?.valueString ||
        !event.secrets['MEDPLUM_MULTITENANT_ACCESS_POLICY_ID']?.valueString ||
        !event.secrets['MEDPLUM_PROJECT_ID']?.valueString) {
      throw new Error('Missing required secrets');
    }

    // Create registration client with admin credentials
    const registrationClient = new MedplumClient({
      baseUrl: medplum.getBaseUrl(),
      clientId: event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_ID'].valueString,
      clientSecret: event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_SECRET'].valueString
    });

    // Initialize client with Basic auth
    await registrationClient.startClientLogin(
      event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_ID'].valueString,
      event.secrets['MEDPLUM_MULTITENANT_ADMIN_CLIENT_SECRET'].valueString
    );

    const { firstName, lastName, email, organization, password } = event.input;

    // Verify access policy exists
    try {
      const accessPolicy = await registrationClient.readResource(
        'AccessPolicy', 
        event.secrets['MEDPLUM_MULTITENANT_ACCESS_POLICY_ID'].valueString
      );
      log('Access Policy exists: ' + JSON.stringify(accessPolicy));
    } catch (err) {
      log('Access policy not found: ' + JSON.stringify(err));
      throw err;
    }

    // Create organization
    log('Creating organization: ' + organization);
    const newOrg = await registrationClient.createResource<Organization>({
      resourceType: 'Organization',
      name: organization,
      meta: {
        project: event.secrets['MEDPLUM_PROJECT_ID'].valueString,
        compartment: [{
          reference: `Project/${event.secrets['MEDPLUM_PROJECT_ID'].valueString}`
        }]
      }
    });

    // Verify organization was created successfully
    if (!newOrg.id) {
      throw new Error('Organization creation failed - no ID returned');
    }

    log('Organization created: ' + newOrg.id);

    // Create practitioner invite
    const inviteRequest = {
      resourceType: 'Practitioner',
      firstName,
      lastName,
      email,
      password,
      sendEmail: false,
      membership: {
        access: [{
          policy: {
            reference: `AccessPolicy/${event.secrets['MEDPLUM_MULTITENANT_ACCESS_POLICY_ID'].valueString}`
          },
          parameter: [{
            name: "current_organization",
            valueReference: {
              reference: `Organization/${newOrg.id}`
            }
          }]
        }]
      }
    };

    // Invite user as practitioner
    log('Creating practitioner invite');
    const inviteResponse = await registrationClient.post(
      `admin/projects/${event.secrets['MEDPLUM_PROJECT_ID'].valueString}/invite`,
      inviteRequest
    );
    log('Invite created');

    // Update practitioner with organization reference
    const practitionerId = inviteResponse.profile.reference.split('/')[1];
    const existingPractitioner = await registrationClient.readResource('Practitioner', practitionerId);
    
    await registrationClient.updateResource({
      ...existingPractitioner,
      meta: {
        ...existingPractitioner.meta,
        compartment: [
          ...(existingPractitioner.meta?.compartment || []),
          {
            reference: `Organization/${newOrg.id}`
          }
        ]
      }
    });
    log('Practitioner updated with organization compartment');

    // Store security info in Communication resource
    if (inviteResponse.passwordResetUrl) {
      const paths = inviteResponse.passwordResetUrl.split('/');
      const id = paths[paths.length - 2];
      const secret = paths[paths.length - 1];

      await registrationClient.createResource({
        resourceType: 'Communication',
        status: 'completed',
        subject: {
          reference: inviteResponse.profile.reference
        },
        category: [{
          coding: [{
            system: 'http://terminology.medplum.org/communication-categories',
            code: 'welcome-email-security'
          }]
        }],
        payload: [{
          contentString: JSON.stringify({
            id,
            secret,
            userReference: inviteResponse.user.reference
          })
        }]
      });
      log('Security info stored in Communication resource');
    }

    // Search and store UserSecurityRequest if needed
    try {
      const securityRequest = await registrationClient.searchOne('UserSecurityRequest', {
        user: `User/${inviteResponse.user.reference.split('/')[1]}`,
        _sort: '-_lastUpdated'
      });
      
      if (securityRequest) {
        await registrationClient.createResource({
          resourceType: 'Communication',
          status: 'completed',
          subject: {
            reference: inviteResponse.profile.reference
          },
          category: [{
            coding: [{
              system: 'http://terminology.medplum.org/communication-categories',
              code: 'welcome-email-security'
            }]
          }],
          payload: [{
            contentString: JSON.stringify({
              id: securityRequest.id,
              secret: securityRequest.secret,
              userReference: securityRequest.user.reference
            })
          }]
        });
        log('Additional security info stored from UserSecurityRequest');
      }
    } catch (error) {
      log('Error searching for UserSecurityRequest: ' + JSON.stringify(error));
    }

    return {
      success: true,
      organizationId: newOrg.id,
      practitionerId,
      userReference: inviteResponse.user.reference,
      debug: debugLog
    };

  } catch (err) {
    log('Registration process failed: ' + JSON.stringify(err));
    throw err;
  }
}

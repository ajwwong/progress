import { BotEvent, MedplumClient } from '@medplum/core';
import { Practitioner } from '@medplum/fhirtypes';

async function createLog(medplum: MedplumClient, message: string): Promise<void> {
  await medplum.createResource({
    resourceType: 'Communication',
    status: 'completed',
    sent: new Date().toISOString(),
    payload: [{
      contentString: message
    }]
  });
}

export async function handler(medplum: MedplumClient, event: BotEvent<Practitioner>): Promise<any> {
  try {
    await createLog(medplum, '=== Bot Start ===');
    
    const practitioner = event.input;
    await createLog(medplum, `Practitioner: ${JSON.stringify(practitioner, null, 2)}`);

    // Get email from Practitioner's telecom
    const email = practitioner.telecom?.find(t => t.system === 'email')?.value;
    if (!email) {
      await createLog(medplum, 'No email found in Practitioner telecom');
      return;
    }

    // Get the ProjectMembership for this Practitioner
    const membership = await medplum.searchOne('ProjectMembership', {
      profile: `Practitioner/${practitioner.id}`
    });

    if (!membership) {
      await createLog(medplum, 'No ProjectMembership found');
      return;
    }

    await createLog(medplum, `Membership found: ${JSON.stringify(membership, null, 2)}`);

    // Get the Organization
    const orgReference = membership.access?.[0]?.parameter?.find(p => p.name === 'current_organization')?.valueReference;
    const organization = orgReference ? await medplum.readReference(orgReference) : undefined;
    await createLog(medplum, `Organization: ${JSON.stringify(organization, null, 2)}`);

    // Get the security info from Communication with retries
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    let securityInfo = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
      await createLog(medplum, `Attempting to find security info (attempt ${i + 1})`);
      
      securityInfo = await medplum.searchOne('Communication', {
        subject: `Practitioner/${practitioner.id}`,
        'category:contains': 'welcome-email-security',
        _sort: '-_lastUpdated'
      });

      if (securityInfo) {
        break;
      }

      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    if (!securityInfo) {
      await createLog(medplum, 'No security info found after all retries');
      return;
    }

    await createLog(medplum, `Security Info found: ${JSON.stringify(securityInfo, null, 2)}`);

    let securityData;
    try {
      securityData = JSON.parse(securityInfo.payload?.[0]?.contentString || '{}');
      
      // Validate the security data
      if (!securityData.id || !securityData.secret || !securityData.userReference) {
        await createLog(medplum, `Invalid security data: ${JSON.stringify(securityData, null, 2)}`);
        return;
      }
    } catch (error) {
      await createLog(medplum, `Error parsing security data: ${error}`);
      return;
    }

    const setPasswordUrl = `http://localhost:5173/setpassword/${securityData.id}/${securityData.secret}`;
    
    const firstName = practitioner.name?.[0]?.given?.[0] || 'New User';
    const orgName = organization?.name || 'Our Platform';
    
    const emailContent = {
      to: email,
      subject: `Welcome to ${orgName}`,
      content: `<h1>Welcome ${firstName}!</h1>

<p>We're excited to have you join ${orgName}.</p>

<p>To get started, please <a href="${setPasswordUrl}">click here to set up your password</a>.</p>

<p>If you have any questions, please don't hesitate to reach out.</p>

<p>Best regards,<br>The Team</p>`,
      contentType: 'text/html'
    };

    await medplum.post('email/v1/send', emailContent);
    return await createLog(medplum, 'Welcome email sent successfully');

  } catch (error) {
    return await medplum.createResource({
      resourceType: 'Communication',
      status: 'completed',
      sent: new Date().toISOString(),
      payload: [{
        contentString: `Error Details:
        Name: ${error.name}
        Message: ${error.message}
        Status: ${error.response?.status}
        Status Text: ${error.response?.statusText}
        Data: ${JSON.stringify(error.response?.data, null, 2)}
        Stack: ${error.stack}`
      }]
    });
  }
}
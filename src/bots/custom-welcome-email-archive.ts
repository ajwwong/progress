import { BotEvent, getDisplayString, getReferenceString, MedplumClient, ProfileResource } from '@medplum/core';
import { UserSecurityRequest, ProjectMembership, Reference, User } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent<UserSecurityRequest>): Promise<any> {
  console.log('=== Bot Execution Start ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Log bot identity and project
    const botIdentity = await medplum.get('auth/me');
    console.log('Bot Identity:', JSON.stringify(botIdentity, null, 2));
    
    // Verify we can access the UserSecurityRequest
    const securityRequest = event.input;
    console.log('Security Request:', JSON.stringify(securityRequest, null, 2));
    
    // Try to read the UserSecurityRequest directly
    const securityRequestRead = await medplum.readResource('UserSecurityRequest', securityRequest.id);
    console.log('Security Request Read:', JSON.stringify(securityRequestRead, null, 2));

    // Get the user details
    const user = await medplum.readReference(securityRequest.user as Reference<User>);
    console.log('User:', JSON.stringify(user, null, 2));
    
    // Get the project membership
    const membership = await medplum.searchOne('ProjectMembership', {
      user: getReferenceString(user)
    }) as ProjectMembership;
    console.log('Membership:', JSON.stringify(membership, null, 2));

    // Get the user's profile (Practitioner in your case)
    const profile = await medplum.readReference(membership.profile as Reference<ProfileResource>);

    // Get email from user
    const email = user.email as string;

    // Generate the setPasswordUrl using the security request
    const setPasswordUrl = `http://localhost:5173/setpassword/${securityRequest.id}/${securityRequest.secret}`;

    // Check if this is a new user invite
    if (securityRequest.type === 'invite') {
      await medplum.sendEmail({
        to: email,
        subject: 'Welcome to My Therapy Scribe!',
        text: [
          `Hello ${getDisplayString(profile)}`,
          '',
          'Welcome to My Therapy Scribe! Please complete your account setup by clicking the link below:',
          '',
          setPasswordUrl,
          '',
          'If you have any questions, please don\'t hesitate to reach out.',
          '',
          'Best regards,',
          'My Therapy Scribe Team'
        ].join('\n')
      });
    }

    return true;
  } catch (error) {
    console.error('=== Bot Error ===');
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}
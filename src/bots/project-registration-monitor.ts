import { BotEvent, Login, MedplumClient } from '@medplum/core';

export async function handler(medplum: MedplumClient, event: BotEvent<Login>): Promise<any> {
  // This is your bot that will receive the webhook when a Login gets updated with membership
  const login = event.input;
  const membership = login.membership;
  
  if (!membership) {
    console.log('Login update without membership - ignoring');
    return;
  }

  // Get the project through the membership
  const projectMembership = await medplum.readReference(membership);
  const project = await medplum.readReference(projectMembership.project);

  console.log('New project created:', project);
  
  // Here you can add your logic to:
  // 1. Update your registration tracking
  // 2. Send notifications
  // 3. Trigger any other workflows
}

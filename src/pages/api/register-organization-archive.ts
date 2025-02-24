/*import { MedplumClient } from '@medplum/core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL,
    clientId: process.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_ID,
    clientSecret: process.env.VITE_MEDPLUM_SUPERADMIN_CLIENT_SECRET
  });

  try {
    // This follows the pattern from kajabi-subscription-purchase.ts
    // Reference lines:
    ```typescript:progress2-base/src/bots/kajabi-subscription-purchase.ts
    startLine: 18
    endLine: 43
    ```

    const organization = await medplum.upsertResource({
      resourceType: 'Organization',
      name: req.body.organization
    });

    const result = await medplum.post(`admin/projects/${process.env.VITE_MEDPLUM_PROJECT_ID}/invite`, {
      resourceType: 'Practitioner',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      membership: {
        access: [{
          policy: {
            reference: "AccessPolicy/multi-tenant-org-policy"
          },
          parameter: [{
            name: "current_organization",
            valueReference: {
              reference: `Organization/${organization.id}`
            }
          }]
        }]
      }
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}*/

import { Card, Stack, Text } from '@mantine/core';
import { Organization } from '@medplum/fhirtypes';

interface OrganizationCardProps {
  organization: Organization;
}

export function OrganizationCard({ organization }: OrganizationCardProps): JSX.Element {
  return (
    <Card withBorder>
      <Stack>
        <Text fw={500} size="lg">Organization Details</Text>
        <Text>ID: {organization.id}</Text>
        <Text>Name: {organization.name}</Text>
      </Stack>
    </Card>
  );
}

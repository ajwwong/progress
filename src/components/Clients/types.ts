export interface Client {
  id: string;
  name: string;
  type: 'Adult' | 'Child';
  phone: string;
  phoneType: 'Mobile' | 'Home' | 'Work';
  email: string;
  emailType: 'Home' | 'Work';
  clinician: string;
}

export const sampleClients: Client[] = [
  {
    id: '1',
    name: 'Jane A. Smith',
    type: 'Adult',
    phone: '(555) 123-4567',
    phoneType: 'Mobile',
    email: 'jane.smith@email.com',
    emailType: 'Home',
    clinician: 'Dr. Wilson'
  },
  {
    id: '2',
    name: 'Robert B. Johnson',
    type: 'Adult',
    phone: '(555) 234-5678',
    phoneType: 'Mobile',
    email: 'robert.johnson@email.com',
    emailType: 'Home',
    clinician: 'Dr. Wilson'
  },
  {
    id: '3',
    name: 'Emily C. Brown',
    type: 'Adult',
    phone: '(555) 345-6789',
    phoneType: 'Work',
    email: 'emily.brown@email.com',
    emailType: 'Work',
    clinician: 'Dr. Wilson'
  }
];
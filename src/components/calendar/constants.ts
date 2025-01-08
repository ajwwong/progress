export const appointmentTypes = [
  { value: 'intake therapy', label: 'Intake Therapy' },
  { value: 'followup therapy', label: 'Follow-up Therapy' },
] as const;

export const locations = [
  { value: 'online', label: 'Online Services' },
  { value: 'office', label: 'Main Office' },
  { value: 'branch', label: 'Branch Clinic' },
] as const;

export const pronounOptions = [
  { value: 'he/him', label: 'He/Him' },
  { value: 'she/her', label: 'She/Her' },
  { value: 'they/them', label: 'They/Them' }
] as const;
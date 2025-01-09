export const appointmentTypes = [
  { 
    value: 'ROUTINE', 
    label: 'Intake Therapy',
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
      code: 'ROUTINE',
      display: 'Routine appointment'
    }],
    serviceType: {
      system: 'http://snomed.info/sct',
      code: '31205005',
      display: 'Psychiatric therapy'
    }
  },
  { 
    value: 'FOLLOWUP', 
    label: 'Follow-up Therapy',
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
      code: 'FOLLOWUP',
      display: 'A follow up visit from a previous appointment'
    }],
    serviceType: {
      system: 'http://snomed.info/sct',
      code: '31205005',
      display: 'Psychiatric therapy'
    }
  }
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
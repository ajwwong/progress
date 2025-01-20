import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { notifications } from '@mantine/notifications';

export interface PatientFormData {
  firstName: string;
  familyName: string;
  phone: string;
  email: string;
  birthDate: string;
  pronouns: string;
  defaultTemplate: string;
}

export interface UsePatientInfoResult {
  isEditing: boolean;
  formData: PatientFormData;
  startEditing: () => void;
  cancelEditing: () => void;
  updateField: (field: keyof PatientFormData, value: string) => void;
  saveChanges: () => Promise<void>;
}

const getPronounDisplay = (code: string): string => {
  const pronounMap: Record<string, string> = {
    'he-him': 'He/Him',
    'she-her': 'She/Her',
    'they-them': 'They/Them',
    'other': 'Other'
  };
  return pronounMap[code] || code;
};

export function usePatientInfo(patient: Patient): UsePatientInfoResult {
  const medplum = useMedplum();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: patient.name?.[0]?.given?.[0] || '',
    familyName: patient.name?.[0]?.family || '',
    phone: patient.telecom?.find(t => t.system === 'phone')?.value || '',
    email: patient.telecom?.find(t => t.system === 'email')?.value || '',
    birthDate: patient.birthDate || '',
    pronouns: patient.extension?.find(e => 
      e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns'
    )?.extension?.find(e => e.url === 'value')?.valueCodeableConcept?.coding?.[0]?.code || '',
    defaultTemplate: 'progress'
  });

  const startEditing = () => setIsEditing(true);
  const cancelEditing = () => setIsEditing(false);

  const updateField = (field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveChanges = async () => {
    try {
      const currentPatient = await medplum.readResource('Patient', patient.id as string);
      
      const updatedPatient = await medplum.updateResource({
        ...currentPatient,
        name: [
          {
            ...currentPatient.name?.[0],
            given: [formData.firstName],
            family: formData.familyName
          }
        ],
        telecom: [
          { system: 'phone', value: formData.phone },
          { system: 'email', value: formData.email }
        ],
        birthDate: formData.birthDate,
        extension: formData.pronouns ? [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/individual-pronouns',
            extension: [
              {
                url: 'value',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/ValueSet/pronouns',
                      code: formData.pronouns,
                      display: getPronounDisplay(formData.pronouns)
                    }
                  ],
                  text: getPronounDisplay(formData.pronouns)
                }
              }
            ]
          }
        ] : []
      });

      notifications.show({
        title: 'Success',
        message: 'Client information updated successfully',
        color: 'green'
      });

      setIsEditing(false);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update client information',
        color: 'red'
      });
      console.error('Error updating patient:', error);
    }
  };

  return {
    isEditing,
    formData,
    startEditing,
    cancelEditing,
    updateField,
    saveChanges
  };
} 
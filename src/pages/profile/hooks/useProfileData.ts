import { useState, useEffect } from 'react';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Practitioner, Extension } from '@medplum/fhirtypes';

export function useProfileData() {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;
  const [profileLoading, setProfileLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [referencePreference, setReferencePreference] = useState<string>('client');
  const [quotePreference, setQuotePreference] = useState<string>('exclude');
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.name?.[0]?.given?.[0] || '');
      setLastName(profile.name?.[0]?.family || '');
      setEmail(profile.telecom?.find(t => t.system === 'email')?.value || '');
      
      const referenceExt = profile.extension?.find(
        (e: Extension) => e.url === 'https://progress.care/fhir/reference-preference'
      );
      setReferencePreference(referenceExt?.valueString || 'client');
      
      const quoteExt = profile.extension?.find(
        (e: Extension) => e.url === 'https://progress.care/fhir/quote-preference'
      );
      setQuotePreference(quoteExt?.valueString || 'exclude');

      const interventionsExt = profile.extension?.find(
        (e: Extension) => e.url === 'https://progress.care/fhir/interventions'
      );
      if (interventionsExt?.valueString) {
        setSelectedInterventions(JSON.parse(interventionsExt.valueString));
      }
      
      setProfileLoading(false);
    }
  }, [profile]);

  return {
    profile,
    profileLoading,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    referencePreference,
    setReferencePreference,
    quotePreference,
    setQuotePreference,
    selectedInterventions,
    setSelectedInterventions
  };
}

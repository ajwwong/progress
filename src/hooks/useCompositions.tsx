import { Composition } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useEffect, useState } from 'react';

export function useCompositions() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let mounted = true;

    const fetchCompositions = async () => {
      if (!profile) {
        return;
      }

      try {
        setIsLoading(true);
        const results = await medplum.searchResources('Composition', {
          author: `Practitioner/${profile.id}`,
          _sort: '-date',
          _count: 100
        });
        
        if (mounted) {
          setCompositions(results);
        }
      } catch (err) {
        console.error('Error fetching compositions:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCompositions();

    return () => {
      mounted = false;
    };
  }, [medplum, profile, updateTrigger]);

  return { compositions, isLoading, triggerUpdate };
}

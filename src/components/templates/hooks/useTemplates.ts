import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { NoteTemplate } from '../types';

// Default template based on the provided example
const defaultTemplate: NoteTemplate = {
  id: '1',
  name: 'Standard Progress Note',
  type: 'progress',
  sections: [
    {
      title: 'Subjective & History',
      content: `Chief Complaint:
[Patient] expresses concerns about [specific symptoms] over the past [timeframe], significantly impacting [areas of daily life].

History of Present Illness:
[Patient] reports [symptoms], characterized by [frequency/severity]. Despite [positive factors], they are experiencing [challenges]. Additionally, [Patient] notes [related symptoms or impacts].

Current Medications:
[Patient] is currently on [medication regimen] but reports [effectiveness/concerns].`
    },
    {
      title: 'Mental Status Exam',
      content: `[Patient] appeared [appearance] and oriented to [orientation details]. Speech was [speech characteristics]. [Patient]'s affect was [affect description], and mood appeared [mood description]. There were [presence/absence] of psychomotor agitation or retardation. Eye contact was [quality]. Social behavior was [description]. Vital signs were [measurements]. [Additional observations]. [Patient] reported [substance use status]. Insight and judgment were [assessment].`
    },
    {
      title: 'Assessment & Plan',
      content: `Assessment:
[Patient] presents with [symptoms/conditions]. Current [treatment/intervention] appears to be [effectiveness assessment].

Plan:

1. [Primary Diagnosis] ([ICD-10 code]):
   • Medication: [medication changes/recommendations]. Monitor response over [timeframe].
   • Therapy: [therapy type/frequency/goals].
   • Lifestyle: [lifestyle recommendations].

2. [Secondary Diagnosis] ([ICD-10 code]):
   • Medication: [medication plan].
   • Therapy: [therapeutic interventions].
   • Lifestyle: [lifestyle modifications].

Follow-Up:
Schedule follow-up appointment in [timeframe] to evaluate progress and adjust treatment plan as needed.`
    }
  ]
};

// TODO: Replace with actual API calls
const mockTemplates: NoteTemplate[] = [defaultTemplate];

export function useTemplates() {
  const medplum = useMedplum();
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      const results = await medplum.searchResources('Basic', 'code=note-template');
      const loadedTemplates = results.map(r => ({
        id: r.id || '',
        name: r.extension?.find(e => e.url === 'name')?.valueString || '',
        type: (r.extension?.find(e => e.url === 'type')?.valueString as NoteTemplate['type']) || 'progress',
        sections: r.extension?.find(e => e.url === 'sections')?.valueString 
          ? JSON.parse(r.extension.find(e => e.url === 'sections')?.valueString || '[]')
          : []
      }));
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: NoteTemplate): Promise<boolean> => {
    try {
      // TODO: Replace with actual API call
      if (template.id) {
        setTemplates(prev => 
          prev.map(t => t.id === template.id ? template : t)
        );
      } else {
        const newTemplate = {
          ...template,
          id: Math.random().toString(36).substr(2, 9)
        };
        setTemplates(prev => [...prev, newTemplate]);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      // TODO: Replace with actual API call
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  };

  useEffect(() => {
    // TODO: Replace with actual API call
    setTemplates(mockTemplates);
    setLoading(false);
  }, []);

  return {
    templates,
    loading,
    error,
    saveTemplate,
    deleteTemplate,
    refresh: loadTemplates
  };
}
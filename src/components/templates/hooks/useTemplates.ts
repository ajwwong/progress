import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { Questionnaire } from '@medplum/fhirtypes';
import { NoteTemplate } from '../types';

const DEFAULT_TEMPLATES: Questionnaire[] = [
  {
    resourceType: "Questionnaire",
    id: "default-therapy-followup",
    title: "Follow up therapy",
    status: "active",
    code: [{
      system: 'http://progress.care/fhir',
      code: 'note-template',
      display: 'Note Template'
    }],
    item: [
      {
        linkId: "subjectiveHistory",
        text: "Subjective & History",
        type: "text",
        initial: [{
          valueString: ''
        }]
      },
      {
        linkId: "mentalStatusExam",
        text: "Mental Status Exam",
        type: "text",
        initial: [{
          valueString: ''
        }]
      },
      {
        linkId: "assessmentPlan",
        text: "Assessment & Plan",
        type: "text",
        initial: [{
          valueString: ''
        }]
      }
    ]
  },
  {
    resourceType: "Questionnaire",
    id: "default-therapy-intake",
    title: "Intake Session",
    status: "active",
    code: [{
      system: 'http://progress.care/fhir',
      code: 'note-template',
      display: 'Note Template'
    }],
    item: [
      {
        linkId: "presentingProblem",
        text: "Presenting Problem",
        type: "text",
        initial: [{
          valueString: ''
        }]
      },
      {
        linkId: "historyAndBackground",
        text: "History & Background",
        type: "text",
        initial: [{
          valueString: ''
        }]
      }
    ]
  }
];

// Default template based on the provided example
const defaultTemplate: NoteTemplate = {
  resourceType: 'Questionnaire',
  status: 'active',
  id: '1',
  name: 'Standard Progress Note',
  type: 'progress',
  sections: [
    {
      title: 'Subjective & History',
      sampleContent: `Chief Complaint:
[Patient] expresses concerns about [specific symptoms] over the past [timeframe], significantly impacting [areas of daily life].

History of Present Illness:
[Patient] reports [symptoms], characterized by [frequency/severity]. Despite [positive factors], they are experiencing [challenges]. Additionally, [Patient] notes [related symptoms or impacts].

Current Medications:
[Patient] is currently on [medication regimen] but reports [effectiveness/concerns].`
    },
    {
      title: 'Mental Status Exam',
      sampleContent: `[Patient] appeared [appearance] and oriented to [orientation details]. Speech was [speech characteristics]. [Patient]'s affect was [affect description], and mood appeared [mood description]. There were [presence/absence] of psychomotor agitation or retardation. Eye contact was [quality]. Social behavior was [description]. Vital signs were [measurements]. [Additional observations]. [Patient] reported [substance use status]. Insight and judgment were [assessment].`
    },
    {
      title: 'Assessment & Plan',
      sampleContent: `Assessment:
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
      const results = await medplum.searchResources('Questionnaire', {
        _count: '100'
      });
      
      // Filter for templates
      const templateResults = [...DEFAULT_TEMPLATES, ...results.filter(q => 
        q.code?.some(c => c.code === 'note-template')
      )];

      const loadedTemplates = templateResults.map(q => ({
        id: q.id || '',
        name: q.title || '',
        type: q.extension?.find(e => 
          e.url === 'http://progress.care/fhir/template-type'
        )?.valueCode as NoteTemplate['type'] || 'progress',
        sections: q.item?.map(item => ({
          title: item.text || '',
          sampleContent: item.initial?.[0]?.valueString || ''
        })) || []
      }));
      
      setTemplates(loadedTemplates as NoteTemplate[]);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: NoteTemplate): Promise<boolean> => {
    try {
      const resource: Questionnaire = {
        resourceType: 'Questionnaire',
        status: 'active',
        title: template.name,
        code: [{
          system: 'http://progress.care/fhir',
          code: 'note-template',
          display: 'Note Template'
        }],
        extension: [
          {
            url: 'http://progress.care/fhir/template-type',
            valueCode: template.type
          }
        ],
        item: template.sections.map(section => ({
          linkId: section.title.toLowerCase().replace(/\s+/g, '-'),
          text: section.title,
          type: 'text',
          initial: [{
            valueString: section.sampleContent
          }]
        }))
      };

      if (template.id) {
        // Update existing template
        await medplum.updateResource({
          ...resource,
          id: template.id
        });
      } else {
        // Create new template
        const savedResource = await medplum.createResource(resource);
        template.id = savedResource.id;
      }

      // Refresh templates list
      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      await medplum.deleteResource('Questionnaire', id);
      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [medplum]);

  return {
    templates,
    loading,
    error,
    saveTemplate,
    deleteTemplate,
    refresh: loadTemplates
  };
}
import { Questionnaire } from '@medplum/fhirtypes';

export const defaultFollowUpTemplate: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  title: 'Follow up therapy',
  identifier: [{
    system: 'http://progress.care/template-identifiers',
    value: 'default-follow-up-therapy'
  }],
  code: [
    {
      system: 'http://progress.care/fhir/template-codes',
      code: 'note-template'
    }
  ],
  extension: [
    {
      url: 'http://progress.care/fhir/template-type',
      valueCode: 'progress'
    }
  ],
  item: [
    {
      linkId: 'subjective_history',
      text: 'Subjective & History',
      type: 'text',
      required: true,
      initial: [{
        valueString: ''
      }]
    },
    {
      linkId: 'mental_status',
      text: 'Mental Status Exam',
      type: 'text',
      required: true,
      initial: [{
        valueString: ''
      }]
    },
    {
      linkId: 'assessment_plan',
      text: 'Assessment & Plan',
      type: 'text',
      required: true,
      initial: [{
        valueString: ''
      }]
    }
  ]
};

// Add more default templates here
export const defaultTemplates = [defaultFollowUpTemplate];

// Helper function to check if a template exists
export const hasTemplate = (templates: Questionnaire[], identifier: string): boolean => {
  return templates.some(t => 
    t.identifier?.some(i => 
      i.system === 'http://progress.care/template-identifiers' && 
      i.value === identifier
    )
  );
}; 
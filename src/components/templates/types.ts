import { Questionnaire } from '@medplum/fhirtypes';

export interface NoteSection {
  title: string;
  content: string;
  sampleContent?: string;
}

export interface NoteTemplate extends Questionnaire {
  id?: string;
  name?: string;
  type?: string;
  sections: Array<{
    title: string;
    sampleContent?: string;
  }>;
}

export const defaultSections: NoteSection[] = [
  {
    title: 'Mental Status Exam',
    content: ''
  },
  {
    title: 'Clinical Observations',
    content: ''
  },
  {
    title: 'Treatment Progress',
    content: ''
  },
  {
    title: 'Plan & Recommendations',
    content: ''
  }
];
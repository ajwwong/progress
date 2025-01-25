export interface NoteSection {
  title: string;
  content: string;
  sampleContent?: string;
}

export interface NoteTemplate {
  id?: string;
  name: string;
  type: 'progress' | 'intake' | 'discharge' | 'treatment';
  sections: NoteSection[];
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
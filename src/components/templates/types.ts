export interface NoteTemplate {
  id?: string;
  name: string;
  type: 'progress' | 'intake' | 'discharge';
  sections: {
    title: string;
    content: string;
  }[];
}

export const defaultSections = [
  {
    title: 'Subjective & History',
    content: `Please ensure to add examples for every section. See below:

Chief Complaint:
[Patient] expresses concerns about [specific symptoms] over the past [timeframe], significantly impacting [areas of daily life].

History of Present Illness:
[Patient] reports [symptoms], characterized by [frequency/severity]. Despite [positive factors], they are experiencing [challenges]. Additionally, [Patient] notes [related symptoms or impacts].

Current Medications:
[Patient] is currently on [medication regimen] but reports [effectiveness/concerns].`
  },
  {
    title: 'Mental Status Exam',
    content: `Please ensure to add examples for every section. See below:

[Patient] appeared [appearance] and oriented to [orientation details]. Speech was [speech characteristics]. [Patient]'s affect was [affect description], and mood appeared [mood description]. There were [presence/absence] of psychomotor agitation or retardation. Eye contact was [quality]. Social behavior was [description]. Vital signs were [measurements]. [Additional observations]. [Patient] reported [substance use status]. Insight and judgment were [assessment].`
  },
  {
    title: 'Assessment & Plan',
    content: `Please ensure to add examples for every section. See below:

Assessment:
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
];
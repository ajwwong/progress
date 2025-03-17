import { Patient, Practitioner } from '@medplum/fhirtypes';
import { NoteTemplate } from '../components/templates/types';

interface TemplateInstructions {
  prompt: string;
  format: string;
}

export function useNoteTemplate() {
  const generateTemplateInstructions = (
    selectedTemplate: NoteTemplate | undefined
  ): string => {
    if (selectedTemplate) {
      return `
You MUST return your response as a valid JSON object, with no additional text before or after. The response must follow this exact format as based on this sample note:

{
  "sections": [
${selectedTemplate.sections.map(section => `    {
      "title": "${section.title}",
      "content": "${section.sampleContent || `[Your detailed content for ${section.title}]`}"
    }`).join(',\n')}
  ]
}

Important JSON formatting rules:
1. Response must be a raw JSON object starting with { and ending with }
2. Use single \n for line breaks in content (e.g. "First line\nSecond line")
3. Each paragraph must be separated by \n\n
4. Each list item must be separated by \n
5. Properly escape all quotes within content strings
6. No truncation or ellipsis in content
7. Each section must have exactly these fields: "title" and "content"
8. Each section must end with a proper comma and closing brace
9. Example content formatting:
   "content": "First paragraph\n\nSecond paragraph\n\nList:\n1. First item\n2. Second item\n3. Third item"`;
    }

    return `
IMPORTANT: You MUST provide a COMPLETE response. Do not truncate or abbreviate any section.
You MUST return your response as a valid JSON object, with no additional text before or after. 
The response must follow this exact format:

{
  "sections": [
    {
      "title": "Subjective & History",
      "content": "[Your detailed subjective content - COMPLETE, not truncated]"
    },
    {
      "title": "Mental Status Exam",
      "content": "[Your detailed MSE content - COMPLETE, not truncated]"
    },
    {
      "title": "Assessment & Plan",
      "content": "[Your detailed assessment and plan - COMPLETE, not truncated]"
    }
  ]
}

Important JSON formatting rules:
1. Response must be a raw JSON object starting with { and ending with }
2. Use single \n for line breaks in content (e.g. "First line\nSecond line")
3. Each paragraph must be separated by \n\n
4. Each list item must be separated by \n
5. Properly escape all quotes within content strings
6. No truncation or ellipsis in content
7. Each section must have exactly these fields: "title" and "content"
8. Each section must end with a proper comma and closing brace
9. Example content formatting:
   "content": "First paragraph\n\nSecond paragraph\n\nList:\n1. First item\n2. Second item\n3. Third item"`;
  };

  const getTherapeuticApproach = (interventions: string[]): string => {
    return interventions.length > 0 
      ? `utilizing ${interventions.length === 1 
          ? interventions[0] 
          : interventions.slice(0, -1).join(', ') + ' and ' + interventions[interventions.length - 1]}`
      : 'using an integrative therapeutic approach';
  };

  const getPatientInfo = (
    referencePreference: string,
    selectedPatient: Patient | undefined
  ): string => {
    let info = '';

    // Add name if preference is set to use names
    if (referencePreference === 'name' && selectedPatient?.name?.[0]) {
      const firstName = selectedPatient.name[0].given?.[0] || '';
      if (firstName) {
        info += `Patient's first name: ${firstName}\n`;
      }
    }

    // Add pronouns if specified
    const pronounsExt = selectedPatient?.extension?.find(e => 
      e.url === 'https://progress.care/fhir/pronouns'
    );
    if (pronounsExt?.valueString) {
      info += `Patient's pronouns: ${pronounsExt.valueString}\n`;
    }

    return info ? `\nPatient Information:\n${info}` : '';
  };

  const generatePrompt = (
    transcript: string,
    selectedPatient: Patient | undefined,
    selectedTemplate: NoteTemplate | undefined,
    practitioner: Practitioner
  ): string => {
    // Get preferences from practitioner extensions
    const referencePreference = practitioner.extension?.find(e => 
      e.url === 'https://progress.care/fhir/reference-preference'
    )?.valueString || 'patient';
    
    const quotePreference = practitioner.extension?.find(e => 
      e.url === 'https://progress.care/fhir/quote-preference'
    )?.valueString || 'exclude';
    
    // Get selected interventions
    let interventions: string[] = [];
    const interventionsExt = practitioner.extension?.find(e => 
      e.url === 'https://progress.care/fhir/interventions'
    );
    if (interventionsExt?.valueString) {
      interventions = JSON.parse(interventionsExt.valueString);
    }

    const therapeuticApproach = getTherapeuticApproach(interventions);
    const patientInfo = getPatientInfo(referencePreference, selectedPatient);
    const templateInstructions = generateTemplateInstructions(selectedTemplate);

    return `
CRITICAL - JSON FORMAT REQUIREMENTS:
1. Return ONLY a valid JSON object
2. DO NOT include ANY text before or after the JSON
3. DO NOT include ANY explanatory text or comments
4. The response must start with "{" and end with "}"
5. Never use a double slash like \\n\\n or \\n in your response but only \n\n or \n.   

${templateInstructions}

As an experienced clinical psychologist or psychotherapist ${therapeuticApproach}, create a comprehensive and clinically precise psychotherapy progress note based on the following therapy session transcript. Your note should reflect deep clinical expertise, demonstrate thorough assessment and therapeutic insight, and adhere to professional documentation standards.

IMPORTANT RESPONSE REQUIREMENTS:
1. Focus on current session content and clinical observations
2. DO NOT include demographic information unless clinically relevant
3. Never use a double slash like \\n\\n or \\n in your response but only \n\n or \n.   

Documentation Requirements:
1. Use clear, objective, and professional language
2. Document risk assessment when applicable

Style and Format:
- When referring to the person being supported, use "${referencePreference === 'name' ? 'their name' : referencePreference}"
- ${quotePreference === 'include' ? 'You are permitted paraphrase or quote up to two or three words from the transcript (attached below) when necessary to illustrate a clinical point' : 'Use only objective clinical language and behavioral descriptions without reproducing any patient verbatim statements.'}
- Use specific, behavioral descriptions
- Include clinical reasoning for interventions
- Begin sections with relevant clinical content
- Return ONLY a raw JSON object with no text before or after
- Do not use any wrapper objects like {text: ''}

FINAL REMINDER: 
1. Your response must be ONLY the JSON object. No other text allowed.
2. Never use a double slash like \\n\\n or \\n in your response but only \n\n or \n -- especially in the content field while making lists.   

${patientInfo}
Transcript:
${transcript}`;
  };

  return {
    generatePrompt,
    generateTemplateInstructions
  };
} 
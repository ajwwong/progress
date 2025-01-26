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
1. Use double quotes for all strings
2. Escape any quotes within content using backslash
3. Use \\n for line breaks
4. Do not include any text outside the JSON object
5. Each section must have exactly these fields: "title" and "content"`;
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
1. Use double quotes for all strings
2. Escape any quotes within content using backslash
3. Use \\n for line breaks
4. Do not include any text outside the JSON object
5. Each section must have exactly these fields: "title" and "content"
6. DO NOT truncate or abbreviate any section content
7. Ensure your response includes ALL content for each section`;
  };

  const getTherapeuticApproach = (interventions: string[]): string => {
    return interventions.length > 0 
      ? `utilizing ${interventions.length === 1 
          ? interventions[0] 
          : interventions.slice(0, -1).join(', ') + ' and ' + interventions[interventions.length - 1]}`
      : 'using an integrative therapeutic approach';
  };

  const getPatientNameInfo = (
    referencePreference: string,
    selectedPatient: Patient | undefined
  ): string => {
    if (referencePreference === 'name' && selectedPatient?.name?.[0]) {
      const firstName = selectedPatient.name[0].given?.[0] || '';
      if (firstName) {
        return `\nPatient's first name: ${firstName}\n`;
      }
    }
    return '';
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
    const patientNameInfo = getPatientNameInfo(referencePreference, selectedPatient);
    const templateInstructions = generateTemplateInstructions(selectedTemplate);

    return `As an experienced clinical psychologist or psychotherapist ${therapeuticApproach}, create a comprehensive and clinically precise psychotherapy progress note based on the following therapy session transcript. Your note should reflect deep clinical expertise, demonstrate thorough assessment and therapeutic insight, and adhere to professional documentation standards.${patientNameInfo}

IMPORTANT RESPONSE REQUIREMENTS:
1. You MUST provide a COMPLETE response for each section
2. DO NOT truncate or abbreviate any section
3. Include ALL relevant clinical information
4. Ensure each section is fully detailed and complete

Important Documentation Requirements:
1. Use clear, objective, and professional language
2. Include relevant clinical observations and specific examples
3. Document risk assessment when applicable
4. Note any changes in symptoms or functioning
5. Record therapeutic interventions used and their effectiveness
6. Include plan for next session 

Style and Format Preferences:
- When referring to the person being supported, use "${referencePreference === 'name' ? 'their name' : referencePreference}"
- ${quotePreference === 'include' ? 'Organically and seamlessly include brief relevant quotes from the session when appropriate to support clinical observations' : 'Do not include direct quotes from the session'}
- Use specific, behavioral descriptions rather than general statements
- Include clinical reasoning for interventions and recommendations
- Please use the following sample note as a reference for the exact format we will be using for the note:

${templateInstructions}

Please ensure each section is thorough, clinically relevant, and provides sufficient detail for continuity of care. The note should clearly document the session's clinical significance and support treatment planning.

IMPORTANT: Your response MUST be complete and include ALL content for each section. Do not truncate or abbreviate any section.

Transcript:
${transcript}`;
  };

  return {
    generatePrompt,
    generateTemplateInstructions
  };
} 
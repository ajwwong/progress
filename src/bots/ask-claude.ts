import { BotEvent, MedplumClient } from '@medplum/core';
import { Patient, Practitioner, Composition } from '@medplum/fhirtypes';

interface NoteGenerationInput {
    transcript: string;
    compositionId?: string;
    patientId?: string;
    metadata?: {
        date: string;
        patientName: string;
        sessionType: string;
    };
}

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
    if (!event.secrets['ANTHROPIC_API_KEY']?.valueString) {
        throw new Error('ANTHROPIC_API_KEY not found in bot secrets');
    }

    console.log('Received event input:', JSON.stringify(event.input, null, 2));

    // If the input is a Patient resource, we need to handle it differently
    if (typeof event.input === 'object' && 'resourceType' in event.input && event.input.resourceType === 'Patient') {
        return { 
            success: false, 
            error: 'Received Patient resource instead of expected transcript data. Please check the input format.' 
        };
    }

    // Extract input based on our expected format
    let text: string;
    let compositionId: string | undefined;
    let patientId: string | undefined;

    if (typeof event.input === 'object' && event.input !== null) {
        // Case 1: Input is an object with our expected properties
        const input = event.input as NoteGenerationInput;
        text = input.transcript;
        compositionId = input.compositionId;
        patientId = input.patientId;
    } else if (typeof event.input === 'string') {
        // Case 2: Input is a string (the transcript)
        text = event.input;
    } else {
        throw new Error(`Invalid input type: ${typeof event.input}`);
    }

    // Validate we have the text to process
    if (!text) {
        throw new Error('No transcript provided for processing');
    }

    try {
        let referencePreference = 'patient';
        let quotePreference = 'exclude';
        let interventions: string[] = [];

        // Get practitioner preferences if we have a compositionId
        if (compositionId) {
            try {
                const composition = await medplum.readResource('Composition', compositionId);
                if (composition.author?.[0]?.reference) {
                    const practitioner = await medplum.readResource('Practitioner', composition.author[0].reference.split('/')[1]);
                    referencePreference = practitioner.extension?.find(e => 
                        e.url === 'https://progress.care/fhir/reference-preference'
                    )?.valueString || 'patient';
                    quotePreference = practitioner.extension?.find(e => 
                        e.url === 'https://progress.care/fhir/quote-preference'
                    )?.valueString || 'exclude';
                    // Get selected interventions
                    const interventionsExt = practitioner.extension?.find(e => 
                        e.url === 'https://progress.care/fhir/interventions'
                    );
                    if (interventionsExt?.valueString) {
                        interventions = JSON.parse(interventionsExt.valueString);
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch practitioner preferences:', err);
                // Continue with defaults if we can't get preferences
            }
        }

        // Create therapeutic approach text based on interventions
        const therapeuticApproach = interventions.length > 0 
            ? `utilizing ${interventions.length === 1 
                ? interventions[0] 
                : interventions.slice(0, -1).join(', ') + ' and ' + interventions[interventions.length - 1]}`
            : 'using an integrative therapeutic approach';

        // Create the prompt for the psychotherapy note
        const prompt = `As an experienced therapist ${therapeuticApproach}, create a rich, insightful, and valuable psychotherapy note based on the following therapy session transcript. Your note should demonstrate deep clinical expertise and provide a comprehensive perspective on the session that aligns with these therapeutic modalities.

Important preferences to follow:
- When referring to the person being supported, use "${referencePreference === 'name' ? 'their name' : referencePreference}"
- ${quotePreference === 'include' ? 'Include relevant quotes from the session when appropriate' : 'Do not include direct quotes from the session'}

Please include the following elements in your note:
1. Session Overview
2. Client Presentation
3. Clinical Formulation
4. Key Moments
5. Interpretation and Insight
6. Treatment Progress
7. Future Directions

Transcript:
${text}`;

        // Call Claude API to generate the note
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': event.secrets['ANTHROPIC_API_KEY'].valueString,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1024,
                messages: [
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Claude API error: ${response.status} ${response.statusText}\n${errorData}`);
        }

        const data = await response.json();
        const generatedNote = data.content[0].text;

        // If we have a compositionId, update the composition
        if (compositionId) {
            try {
                const composition = await medplum.readResource('Composition', compositionId);
                const updatedComposition: Composition = {
                    ...composition,
                    status: 'final' as const,
                    section: [
                        {
                            title: 'Psychotherapy Note',
                            text: {
                                status: 'generated',
                                div: `<div xmlns="http://www.w3.org/1999/xhtml">${generatedNote}</div>`
                            }
                        },
                        ...(composition.section || [])
                    ]
                };
                await medplum.updateResource(updatedComposition);
            } catch (updateErr) {
                console.error('Error updating composition:', updateErr);
                // Continue execution to return the generated note even if saving fails
            }
        }

        // Return the generated note
        return { 
            success: true,
            note: generatedNote
        };

    } catch (err) {
        console.error('Error in note generation bot:', err);
        return {
            success: false,
            error: (err as Error).message
        };
    }
}
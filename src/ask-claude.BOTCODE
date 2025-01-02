import { BotEvent, MedplumClient } from '@medplum/core';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
    if (!event.secrets['ANTHROPIC_API_KEY']?.valueString) {
        return { text: 'Error: ANTHROPIC_API_KEY not found in bot secrets' };
    }

    // Convert input to string based on type
    const userMessage = typeof event.input === 'string' 
        ? event.input 
        : JSON.stringify(event.input, null, 2);

    try {
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
                        content: userMessage 
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            return { text: `Claude API error: ${response.status} ${response.statusText}\n${errorData}` };
        }

        const data = await response.json();
        return { text: data.content[0].text };
    } catch (err) {
        return { text: `Error: ${(err as Error).message}` };
    }
}
import { BotEvent, MedplumClient } from '@medplum/core';
import { Anthropic } from '@anthropic-ai/sdk';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
                { role: "user", content: event.input }
            ]
        });

        // Return Claude's response text
        return message.content[0].text;
    } catch (error) {
        console.error('Claude API Error:', error);
        return 'Sorry, I encountered an error while processing your request.';
    }
} 
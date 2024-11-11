import { MedplumClient } from '@medplum/core';

// Set up venue access
const medplum = new MedplumClient({
    baseUrl: 'http://localhost:8103',
    clientId: 'c9aa51a2-263b-49f1-b861-fddfb13bc54c',
    clientSecret: '2f78331918769120dfa067513638f7a0ee53b06c0a3576432df73a3f992fe3a8'
}); 

// Test function
async function askClaude() {
    try {
        console.log('🎭 Sending question to Claude...');
        
        const question = 'Please tell a silly story!';
        
        const response = await medplum.executeBot(
            '5731008c-42a6-4fdc-8969-2560667b4f1d',  // Replace with your Claude Bot ID
            { text: question },  // Wrap in object with text property
            'application/json'   // Change to JSON content type
        );
        
        console.log('🤖 Claude replied:', response.text); // Access text property
    } catch (error) {
        console.error('🚨 Oops:', error);
    }
}

// Run it!
console.log('🎬 Starting Claude conversation...');
askClaude(); 
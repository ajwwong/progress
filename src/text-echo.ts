import { MedplumClient } from '@medplum/core';

// Set up venue access
const medplum = new MedplumClient({
    baseUrl: 'http://localhost:8103',
    clientId: 'c9aa51a2-263b-49f1-b861-fddfb13bc54c',
    clientSecret: '2f78331918769120dfa067513638f7a0ee53b06c0a3576432df73a3f992fe3a8'
});

// Test function
async function testTextEcho() {
    try {
        console.log('🎭 Sending text to Bot...');
        
        const textMessage = 'Please tell me a joke, Claude!';
        
        const response = await medplum.executeBot(
            'a4c39dce-baeb-48f8-bcc6-73247181167d',  // Replace with your Bot ID
            textMessage,
            'text/plain'  // Changed to text/plain for simple text
        );
        
        console.log('🤖 Bot replied:', response);
    } catch (error) {
        console.error('🚨 Oops:', error);
    }
}

// Run it!
console.log('🎬 Starting Text Echo test...');
testTextEcho();

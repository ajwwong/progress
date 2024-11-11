// src/components/AudioRecorder.tsx
import React, { useState, useRef } from 'react';
import { MedplumClient } from '@medplum/core';

const medplum = new MedplumClient({
    baseUrl: 'http://localhost:8103',
    clientId: 'c9aa51a2-263b-49f1-b861-fddfb13bc54c',    
    clientSecret: '2f78331918769120dfa067513638f7a0ee53b06c0a3576432df73a3f992fe3a8'    
});

export const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState('Ready');
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            setStatus('Starting recording...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                setStatus('Processing audio...');
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                
                try {
                    // Convert Blob to ArrayBuffer
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioData = new Uint8Array(arrayBuffer);
                    
                    setStatus('Uploading to Binary storage...');
                    // Create Binary like in your working version
                    const binary = await medplum.createBinary({
                        data: audioData,
                        contentType: 'audio/wav'
                    });
                    
                    setStatus('Sending to Bot...');
                    // Send to Boffo the Transcriber Bot using your working approach
                    const response = await medplum.executeBot(
                        '1255675e-266d-4ab9-bc69-a850c6ca4875',
                        {
                            type: 'audio',
                            binaryId: binary.id
                        },
                        'application/json'
                    );
        
                    if (response.details?.transcript) {
                        setTranscript(response.details.transcript);
                        setStatus('Transcription complete!');
                    } else {
                        setStatus('Error: No transcript received');
                        console.log('Full response:', response);
                    }
                } catch (error) {
                    setStatus('Error: ' + error.message);
                    console.error('Full error:', error);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setStatus('Recording...');
        } catch (error) {
            setStatus('Error: ' + error.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            setStatus('Stopping recording...');
        }
    };

    return (
        <div className="audio-recorder">
            <h2>Backstage Notes Recorder</h2>
            <div className="controls">
                {!isRecording ? (
                    <button onClick={startRecording}>🎤 Start Recording</button>
                ) : (
                    <button onClick={stopRecording}>⏹️ Stop Recording</button>
                )}
            </div>
            <div className="status">
                Status: {status}
            </div>
            {transcript && (
                <div className="transcript">
                    <h3>Transcript:</h3>
                    <p>{transcript}</p>
                </div>
            )}
        </div>
    );
};
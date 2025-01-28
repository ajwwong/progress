import { useState, useRef, useEffect } from 'react';

interface UseAudioRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  isBlinking: boolean;
  audioBlob: Blob | null;
  status: string;
  stream: MediaStream | null;
  startRecording: (isTelehealth: boolean) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  playAudio: () => Promise<void>;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState('Ready');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = async (isTelehealth: boolean) => {
    try {
      setStatus('Starting recording...');
      let audioStream: MediaStream;

      if (isTelehealth) {
        try {
          // First get microphone audio
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          // Then try to get system audio
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "browser"
            },
            audio: {
              autoGainControl: false,
              echoCancellation: false,
              noiseSuppression: false,
            }
          });

          // Create a new audio context
          const audioContext = new AudioContext();

          // Create sources for both streams
          const micSource = audioContext.createMediaStreamSource(micStream);
          const sysSource = audioContext.createMediaStreamSource(displayStream);

          // Create a merger to combine both audio streams
          const merger = audioContext.createChannelMerger(2);

          // Connect both sources to the merger
          micSource.connect(merger, 0, 0);
          sysSource.connect(merger, 0, 1);

          // Create a destination to get the combined stream
          const dest = audioContext.createMediaStreamDestination();
          merger.connect(dest);

          // Create the final combined stream
          audioStream = dest.stream;

          // Clean up video tracks
          displayStream.getVideoTracks().forEach(track => track.stop());

          // Add cleanup function
          const cleanup = () => {
            audioContext.close();
            displayStream.getTracks().forEach(track => track.stop());
            micStream.getTracks().forEach(track => track.stop());
          };

          // Add cleanup to window unload
          window.addEventListener('beforeunload', cleanup);

        } catch (err) {
          console.warn('Failed to capture system audio, falling back to microphone only:', err);
          // Fallback to microphone only
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });
        }
      } else {
        // For in-person, just capture microphone with enhanced settings
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      }

      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        throw new Error('No audio input detected');
      }

      mediaRecorder.current = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      setStream(audioStream);
      chunksRef.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('Recording saved');
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      setStream(null);
      console.error('Error starting recording:', err);
      setStatus('Error: Could not start recording');
      throw new Error('Could not start recording');
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve, reject) => {
      if (mediaRecorder.current && isRecording) {
        const onStop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          setStatus('Recording saved');
          resolve(blob);
        };
        mediaRecorder.current.onstop = onStop;
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setIsRecording(false);
        setIsPaused(false);
      } else {
        reject(new Error('No active recording to stop'));
      }
    });
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.resume();
      setIsPaused(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setAudioBlob(null);
      chunksRef.current = [];
    }
  };

  const playAudio = async () => {
    if (!audioBlob) return;
    try {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => URL.revokeObjectURL(audio.src);
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setStatus('Error: Could not play audio');
      throw new Error('Could not play audio');
    }
  };

  return {
    isRecording,
    isPaused,
    isBlinking,
    audioBlob,
    status,
    stream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playAudio
  };
}
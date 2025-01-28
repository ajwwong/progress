import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

interface AudioMeterProps {
  stream: MediaStream | null;
  isRecording: boolean;
  isPaused?: boolean;
}

export function AudioMeter({ stream, isRecording, isPaused }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();
  const previousDataRef = useRef<number[]>([]);

  useEffect(() => {
    if (!stream || !isRecording || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      previousDataRef.current = [];
      return;
    }

    // Set up audio context and analyser
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    analyserRef.current.smoothingTimeConstant = 0.92; // Increased smoothing
    
    // Connect stream to analyser
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Initialize previous data array if empty
    if (previousDataRef.current.length === 0) {
      previousDataRef.current = new Array(bufferLength).fill(0);
    }

    const draw = () => {
      if (!analyserRef.current || !ctx) return;

      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // Decay rates - much gentler now
      const riseRate = 0.4;    // Slower rise (was 0.8)
      const fallRate = 0.02;   // Much slower fall (was 0.08)

      for (let i = 0; i < bufferLength; i++) {
        // Apply rise/fall smoothing
        const targetHeight = (dataArray[i] / 255) * canvas.height;
        let currentHeight = previousDataRef.current[i];
        
        if (targetHeight > currentHeight) {
          // Rising - gentler response
          currentHeight = (targetHeight * riseRate) + (currentHeight * (1 - riseRate));
        } else {
          // Falling - much slower decay
          currentHeight = Math.max(0, currentHeight - (canvas.height * fallRate));
        }
        
        previousDataRef.current[i] = currentHeight;

        // Create gradient effect based on amplitude
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#2c5282');    // Deep earthy blue (matches button start)
        gradient.addColorStop(0.5, '#2b6cb0');  // Middle transition
        gradient.addColorStop(1, '#3182ce');    // Soft sky blue (matches button end)

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - currentHeight, barWidth, currentHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording, isPaused]);

  return (
    <Box 
      style={{ 
        backgroundColor: 'white',
        borderRadius: 'var(--mantine-radius-md)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
        borderTop: 'none',
        overflow: 'hidden',
        maxWidth: '340px',
        margin: '0 auto'
      }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={30}
        style={{
          width: '100%',
          height: '30px',
          display: 'block'
        }}
      />
    </Box>
  );
} 
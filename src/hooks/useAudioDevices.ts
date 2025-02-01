import { useState, useEffect } from 'react';

interface AudioDevice {
  deviceId: string;
  label: string;
}

export function useAudioDevices() {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputDevices.map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId}`
        })));

        if (audioInputDevices.length > 0) {
          setSelectedDevice(audioInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching audio devices:', err);
      }
    };

    fetchAudioDevices();
  }, []);

  return {
    audioDevices,
    selectedDevice,
    setSelectedDevice
  };
} 
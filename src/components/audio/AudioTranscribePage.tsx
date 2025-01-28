import { AudioMeter } from './AudioMeter';

{isRecording && (
  <Stack gap="sm">
    <AudioMeter stream={mediaStream} isRecording={isRecording} />
    <Group justify="center">
      <Button
        onClick={handleStopRecording}
        color="red"
        leftSection={<IconSquare size={16} />}
      >
        Stop Recording
      </Button>
    </Group>
  </Stack>
)} 
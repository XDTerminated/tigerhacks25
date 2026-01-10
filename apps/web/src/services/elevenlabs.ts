import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
});

export async function textToSpeech(text: string, voiceId: string): Promise<string> {
  try {
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_turbo_v2_5',
      outputFormat: 'mp3_44100_128',
    });

    // Convert the audio stream to a blob and create a URL
    const reader = audio.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const blob = new Blob(chunks as unknown as BlobPart[], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    return url;
  } catch (error) {
    console.error('ElevenLabs error:', error);
    throw new Error('Failed to convert text to speech');
  }
}

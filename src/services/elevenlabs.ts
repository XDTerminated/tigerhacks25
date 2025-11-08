import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
});

export async function textToSpeech(text: string, voiceId: string): Promise<string> {
  try {
    console.log('🔊 ElevenLabs: Converting text to speech...');
    console.log('📝 Text to convert:', text);
    console.log('🎤 Using voice ID:', voiceId);
    
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_turbo_v2_5',
      outputFormat: 'mp3_44100_128',
    });

    console.log('✅ ElevenLabs: Audio stream received');

    // Convert the audio stream to a blob and create a URL
    const reader = audio.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    console.log('✅ ElevenLabs: Received', chunks.length, 'audio chunks');

    const blob = new Blob(chunks as unknown as BlobPart[], { type: 'audio/mpeg' });
    console.log('✅ ElevenLabs: Created blob, size:', blob.size, 'bytes');
    
    const url = URL.createObjectURL(blob);
    console.log('✅ ElevenLabs: Created audio URL:', url);
    
    return url;
  } catch (error) {
    console.error('❌ ElevenLabs error:', error);
    throw new Error('Failed to convert text to speech');
  }
}

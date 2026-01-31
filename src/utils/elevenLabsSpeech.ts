/**
 * ElevenLabs Text-to-Speech
 * 
 * Uses ElevenLabs AI for the most natural-sounding speech.
 * Requires NEXT_PUBLIC_ELEVENLABS_API_KEY env var.
 * 
 * Free tier: 10,000 characters/month
 */

export interface ElevenLabsConfig {
  voiceId?: string;           // Voice ID from ElevenLabs
  modelId?: string;           // Model ID (eleven_monolingual_v1, eleven_multilingual_v2, etc.)
  stability?: number;         // Voice stability (0-1)
  similarityBoost?: number;   // Similarity boost (0-1)
  style?: number;             // Style exaggeration (0-1, only for v2 models)
}

const DEFAULT_CONFIG: ElevenLabsConfig = {
  voiceId: '21m00Tcm4TlvDq8ikWAM',  // "Rachel" - clear, professional female voice
  modelId: 'eleven_monolingual_v1',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
};

// Cache for audio elements to allow stopping
let currentAudio: HTMLAudioElement | null = null;

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
}

/**
 * Synthesize speech using ElevenLabs
 */
export async function speakWithElevenLabs(text: string, config: ElevenLabsConfig = {}): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('ElevenLabs not configured. Set NEXT_PUBLIC_ELEVENLABS_API_KEY.');
    return;
  }

  // Stop any currently playing audio
  stopElevenLabsSpeech();

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${mergedConfig.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: mergedConfig.modelId,
          voice_settings: {
            stability: mergedConfig.stability,
            similarity_boost: mergedConfig.similarityBoost,
            style: mergedConfig.style,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise((resolve, reject) => {
      currentAudio = new Audio(audioUrl);
      
      currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        resolve();
      };
      
      currentAudio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        reject(new Error('Audio playback failed'));
      };

      currentAudio.play().catch(reject);
    });
  } catch (error) {
    console.error('ElevenLabs Speech error:', error);
    throw error;
  }
}

/**
 * Stop any currently playing ElevenLabs speech
 */
export function stopElevenLabsSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Check if ElevenLabs speech is currently playing
 */
export function isElevenLabsSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Popular ElevenLabs voice IDs
 * You can find more at: https://api.elevenlabs.io/v1/voices
 */
export const ELEVENLABS_VOICES = {
  // Pre-made voices (available on free tier)
  'Rachel': '21m00Tcm4TlvDq8ikWAM',      // Female, calm, professional
  'Domi': 'AZnzlk1XvdvUeBnXmlld',        // Female, strong, confident  
  'Bella': 'EXAVITQu4vr4xnSDxMaL',       // Female, soft, warm
  'Antoni': 'ErXwobaYiN019PkySvjV',      // Male, well-rounded
  'Elli': 'MF3mGyEYCl7XYWbV9V6O',        // Female, young, energetic
  'Josh': 'TxGEqnHWrfWFTfGW9XjX',        // Male, deep, narrative
  'Arnold': 'VR6AewLTigWG4xSOukaG',      // Male, crisp, authoritative
  'Adam': 'pNInz6obpgDQGcFmaJgB',        // Male, deep, middle-aged
  'Sam': 'yoZ06aMxZJJ28mfd3POQ',         // Male, raspy, dynamic
} as const;

/**
 * ElevenLabs model IDs
 */
export const ELEVENLABS_MODELS = {
  'monolingual_v1': 'eleven_monolingual_v1',     // English only, fast
  'multilingual_v1': 'eleven_multilingual_v1',   // Multi-language
  'multilingual_v2': 'eleven_multilingual_v2',   // Best quality, multi-language
  'turbo_v2': 'eleven_turbo_v2',                 // Fastest, good quality
} as const;

/**
 * Azure Cognitive Services Speech - Text-to-Speech
 * 
 * Uses Azure's Neural TTS voices for natural-sounding speech.
 * Requires NEXT_PUBLIC_AZURE_SPEECH_KEY and NEXT_PUBLIC_AZURE_SPEECH_REGION env vars.
 * 
 * Free tier: 500,000 characters/month
 * 
 * Supported styles for en-US-GuyNeural:
 * - cheerful, sad, angry, terrified, shouting, whispering, serious, newscast
 * 
 * Supported styles for en-US-DavisNeural (narrative voice):
 * - cheerful, sad, angry, terrified, shouting, whispering, friendly, newscast
 * 
 * Supported styles for en-US-JennyNeural (female):
 * - cheerful, sad, angry, terrified, shouting, whispering, friendly, newscast, chat
 * 
 * Note: If a style is not supported, Azure will use the default voice without style.
 */

// Valid Azure styles for GuyNeural (our default voice)
export const AZURE_STYLES = [
  'cheerful',
  'sad', 
  'angry',
  'terrified',
  'shouting',
  'whispering',
  'serious',
  'hopeful',      // Maps to cheerful for voices that don't support it
  'newscast',
] as const;

export type AzureStyle = typeof AZURE_STYLES[number];

export interface AzureSpeechConfig {
  voice?: string;           // Voice name (e.g., "en-US-GuyNeural")
  style?: string;           // Speaking style (e.g., "cheerful", "terrified")
  rate?: string;            // Speech rate (e.g., "slow", "medium", "fast", or percentage)
  pitch?: string;           // Pitch adjustment (e.g., "low", "medium", "high")
}

const DEFAULT_CONFIG: AzureSpeechConfig = {
  voice: 'en-US-GuyNeural',  // Deep male voice, good for narrator
  style: 'serious',
  rate: 'medium',
  pitch: 'medium',
};

// Cache for audio elements to allow stopping
let currentAudio: HTMLAudioElement | null = null;

/**
 * Check if Azure Speech is configured
 */
export function isAzureSpeechConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY && 
    process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION
  );
}

/**
 * Map custom styles to Azure-supported styles
 * Some styles like 'hopeful' aren't directly supported, so we map them
 */
function mapStyle(style: string | undefined): string {
  const styleMap: Record<string, string> = {
    'hopeful': 'cheerful',     // Hopeful -> cheerful tone
    'default': 'serious',
  };
  
  if (!style) return 'serious';
  return styleMap[style] || style;
}

/**
 * Build SSML (Speech Synthesis Markup Language) for Azure
 */
function buildSSML(text: string, config: AzureSpeechConfig): string {
  const voice = config.voice || DEFAULT_CONFIG.voice;
  const rawStyle = config.style || DEFAULT_CONFIG.style;
  const style = mapStyle(rawStyle);  // Map to supported style
  const rate = config.rate || DEFAULT_CONFIG.rate;
  const pitch = config.pitch || DEFAULT_CONFIG.pitch;

  // Check if the voice supports styles (Neural voices do)
  const supportsStyle = voice?.includes('Neural');

  let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">`;
  ssml += `<voice name="${voice}">`;
  
  if (supportsStyle && style) {
    ssml += `<mstts:express-as style="${style}">`;
  }
  
  ssml += `<prosody rate="${rate}" pitch="${pitch}">`;
  ssml += text;
  ssml += `</prosody>`;
  
  if (supportsStyle && style) {
    ssml += `</mstts:express-as>`;
  }
  
  ssml += `</voice></speak>`;
  
  return ssml;
}

/**
 * Synthesize speech using Azure Cognitive Services
 */
export async function speakWithAzure(text: string, config: AzureSpeechConfig = {}): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

  if (!apiKey || !region) {
    console.error('Azure Speech not configured. Set NEXT_PUBLIC_AZURE_SPEECH_KEY and NEXT_PUBLIC_AZURE_SPEECH_REGION.');
    return;
  }

  // Stop any currently playing audio
  stopAzureSpeech();

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const ssml = buildSSML(text, mergedConfig);

  try {
    const response = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'MafiaGame',
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`);
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
    console.error('Azure Speech error:', error);
    throw error;
  }
}

/**
 * Stop any currently playing Azure speech
 */
export function stopAzureSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Check if Azure speech is currently playing
 */
export function isAzureSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Available Azure Neural voices good for a game narrator
 */
export const AZURE_VOICES = {
  // Male voices
  'en-US-GuyNeural': 'Guy (US Male, Deep)',
  'en-US-DavisNeural': 'Davis (US Male)',
  'en-US-JasonNeural': 'Jason (US Male)',
  'en-GB-RyanNeural': 'Ryan (UK Male)',
  
  // Female voices  
  'en-US-JennyNeural': 'Jenny (US Female)',
  'en-US-AriaNeural': 'Aria (US Female, Expressive)',
  'en-US-SaraNeural': 'Sara (US Female)',
  'en-GB-SoniaNeural': 'Sonia (UK Female)',
} as const;

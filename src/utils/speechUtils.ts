/**
 * Speech Utilities - Text-to-Speech Facade
 * 
 * Provides a unified interface for multiple TTS providers:
 * - 'browser': Web Speech API (free, robotic)
 * - 'azure': Azure Cognitive Services (natural, 500K chars/month free)
 * - 'elevenlabs': ElevenLabs (most natural, 10K chars/month free)
 * 
 * The provider is configured in gameConfig.json via tts.provider
 */

import { speakWithAzure, stopAzureSpeech, isAzureSpeechConfigured, AzureSpeechConfig } from './azureSpeech';
import { speakWithElevenLabs, stopElevenLabsSpeech, isElevenLabsConfigured, ElevenLabsConfig } from './elevenLabsSpeech';
import { gameConfig } from '@/config/configManager';

// Re-export types
export type TTSProvider = 'browser' | 'azure' | 'elevenlabs';

export interface SpeechOptions {
  rate?: number;      // Speech rate for browser TTS
  pitch?: number;     // Pitch for browser TTS
  volume?: number;    // Volume for browser TTS
  voice?: SpeechSynthesisVoice | null;
  // Azure-specific
  azureVoice?: string;
  azureStyle?: string;
  // ElevenLabs-specific
  elevenLabsVoiceId?: string;
}

const DEFAULT_OPTIONS: SpeechOptions = {
  rate: 0.9,
  pitch: 1,
  volume: 1,
  voice: null,
};

// Track state for browser TTS
let voicesLoaded = false;
let voicesLoadedPromise: Promise<void> | null = null;

/**
 * Get the currently configured TTS provider
 */
export function getTTSProvider(): TTSProvider {
  const configuredProvider = gameConfig.tts?.provider || 'browser';
  
  // Fallback to browser if configured provider isn't available
  if (configuredProvider === 'azure' && !isAzureSpeechConfigured()) {
    console.warn('Azure Speech not configured, falling back to browser TTS');
    return 'browser';
  }
  
  if (configuredProvider === 'elevenlabs' && !isElevenLabsConfigured()) {
    console.warn('ElevenLabs not configured, falling back to browser TTS');
    return 'browser';
  }
  
  return configuredProvider as TTSProvider;
}

/**
 * Check if speech is supported (at least browser TTS)
 */
export function isSpeechSupported(): boolean {
  const provider = getTTSProvider();
  
  if (provider === 'azure') return isAzureSpeechConfigured();
  if (provider === 'elevenlabs') return isElevenLabsConfigured();
  
  // Browser TTS
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Wait for TTS to be ready (mainly for browser TTS voices)
 */
export function waitForVoices(): Promise<void> {
  const provider = getTTSProvider();
  
  // Azure and ElevenLabs don't need voice loading
  if (provider !== 'browser') {
    return Promise.resolve();
  }
  
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve();
  }
  
  if (voicesLoaded && window.speechSynthesis.getVoices().length > 0) {
    return Promise.resolve();
  }
  
  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }
  
  voicesLoadedPromise = new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve();
      return;
    }
    
    const handleVoicesChanged = () => {
      voicesLoaded = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve();
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    setTimeout(() => {
      voicesLoaded = true;
      resolve();
    }, 1000);
  });
  
  return voicesLoadedPromise;
}

/**
 * Get available browser voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Get a preferred English voice for browser TTS
 */
export function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  
  if (voices.length === 0) return null;
  
  const preferredNames = ['Google US English', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'];
  
  for (const name of preferredNames) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) return englishVoice;
  
  return voices[0] || null;
}

/**
 * Speak using browser's Web Speech API
 */
async function speakWithBrowser(text: string, options: SpeechOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Browser speech synthesis not supported');
    return;
  }

  await waitForVoices();
  window.speechSynthesis.cancel();
  await new Promise(resolve => setTimeout(resolve, 100));

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    utterance.rate = mergedOptions.rate!;
    utterance.pitch = mergedOptions.pitch!;
    utterance.volume = mergedOptions.volume!;
    
    const voice = mergedOptions.voice || getPreferredVoice();
    if (voice) utterance.voice = voice;

    // Chrome bug workaround
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
    
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive);
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    
    utterance.onend = () => {
      clearInterval(keepAlive);
      resolve();
    };
    
    utterance.onerror = () => {
      clearInterval(keepAlive);
      resolve();
    };
  });
}

/**
 * Speak the given text using the configured TTS provider
 */
export async function speak(text: string, options: SpeechOptions = {}): Promise<void> {
  const provider = getTTSProvider();
  
  try {
    switch (provider) {
      case 'azure':
        const azureConfig: AzureSpeechConfig = {
          voice: options.azureVoice || gameConfig.tts?.azure?.voice,
          style: options.azureStyle || gameConfig.tts?.azure?.style,
          rate: gameConfig.tts?.azure?.rate,
          pitch: gameConfig.tts?.azure?.pitch,
        };
        await speakWithAzure(text, azureConfig);
        break;
        
      case 'elevenlabs':
        const elevenLabsConfig: ElevenLabsConfig = {
          voiceId: options.elevenLabsVoiceId || gameConfig.tts?.elevenlabs?.voiceId,
          modelId: gameConfig.tts?.elevenlabs?.modelId,
          stability: gameConfig.tts?.elevenlabs?.stability,
          similarityBoost: gameConfig.tts?.elevenlabs?.similarityBoost,
        };
        await speakWithElevenLabs(text, elevenLabsConfig);
        break;
        
      case 'browser':
      default:
        await speakWithBrowser(text, options);
        break;
    }
  } catch (error) {
    console.error(`TTS error with provider ${provider}:`, error);
    // Fallback to browser TTS if cloud provider fails
    if (provider !== 'browser') {
      console.log('Falling back to browser TTS');
      await speakWithBrowser(text, options);
    }
  }
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  // Stop all providers to be safe
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  stopAzureSpeech();
  stopElevenLabsSpeech();
}

/**
 * Night phase announcements for each role with appropriate Azure styles
 */
export interface RoleAnnouncement {
  text: string;
  azureStyle: string;  // Azure SSML style for emotional delivery
}

export const NIGHT_ANNOUNCEMENTS: Record<string, RoleAnnouncement> = {
  MAFIA_TEAM: {
    text: "Mafia team, open your eyes and look at each other. Agree on which player to eliminate tonight. One of you will select the target on the phone. Place the phone back once done and close your eyes.",
    azureStyle: "whispering"  // Secretive, conspiratorial
  },
  Mafia: {
    text: "Mafia, open your eyes and take the phone to select your target. Place the phone back once done and close your eyes.",
    azureStyle: "serious"  // Menacing and deliberate
  },
  Godfather: {
    text: "Godfather, open your eyes and take the phone to select your target. Place the phone back once done and close your eyes.",
    azureStyle: "serious"  // Commanding authority
  },
  Hooker: {
    text: "Hooker, open your eyes and take the phone to select who to roleblock tonight. Place the phone back once done and close your eyes.",
    azureStyle: "whispering"  // Seductive and secretive
  },
  Detective: {
    text: "Detective, open your eyes and take the phone to investigate a player. Place the phone back once done and close your eyes.",
    azureStyle: "serious"  // Focused and determined
  },
  Doctor: {
    text: "Doctor, open your eyes and take the phone to protect a player tonight. Place the phone back once done and close your eyes.",
    azureStyle: "hopeful"  // Caring and protective
  },
  Silencer: {
    text: "Silencer, open your eyes and take the phone to silence a player for tomorrow's discussion. Place the phone back once done and close your eyes.",
    azureStyle: "whispering"  // Ominous and quiet
  },
};

/**
 * Get the announcement for a specific role
 */
export function getRoleAnnouncement(role: string): RoleAnnouncement {
  return NIGHT_ANNOUNCEMENTS[role] || {
    text: `${role}, open your eyes and take the phone to complete your action. Place the phone back once done and close your eyes.`,
    azureStyle: "serious"
  };
}

/**
 * Speak the night phase opening announcement
 */
export function speakNightOpening(nightNumber: number): Promise<void> {
  return speak(`Night ${nightNumber}. Everyone close your eyes.`, { azureStyle: 'serious' });
}

/**
 * Speak the role turn announcement with appropriate style
 */
export function speakRoleTurn(role: string): Promise<void> {
  const announcement = getRoleAnnouncement(role);
  return speak(announcement.text, { azureStyle: announcement.azureStyle });
}

/**
 * Speak the end of night announcement
 */
export function speakNightEnding(): Promise<void> {
  return speak("All players may now open your eyes. The sun is rising.", { azureStyle: 'cheerful' });
}

/**
 * Contextual announcement styles for various game events
 */
export const GAME_EVENT_STYLES = {
  // Night events
  nightStart: 'serious',
  nightEnd: 'cheerful',
  
  // Death/elimination events
  playerKilled: 'terrified',
  playerEliminated: 'sad',
  noDeathLastNight: 'hopeful',
  
  // Special role events
  doctorSaved: 'hopeful',
  roleblocked: 'whispering',
  silenced: 'whispering',
  
  // Victory announcements
  mafiaWins: 'terrified',
  townWins: 'cheerful',
  jokerWins: 'cheerful',
  
  // Voting
  voteResult: 'serious',
  tieVote: 'serious',
} as const;

/**
 * Speak a death announcement (when someone is killed at night)
 */
export function speakDeathAnnouncement(playerName: string): Promise<void> {
  return speak(
    `${playerName} was found dead this morning. They have been eliminated from the game.`,
    { azureStyle: 'terrified' }
  );
}

/**
 * Speak when no one died last night
 */
export function speakNoDeath(): Promise<void> {
  return speak(
    "The town wakes up to find that no one was killed last night.",
    { azureStyle: 'hopeful' }
  );
}

/**
 * Speak when the doctor saves someone
 */
export function speakDoctorSaved(): Promise<void> {
  return speak(
    "The doctor's intervention saved a life last night!",
    { azureStyle: 'hopeful' }
  );
}

/**
 * Speak victory announcement
 */
export function speakVictory(winner: 'mafia' | 'town' | 'joker'): Promise<void> {
  const announcements = {
    mafia: { text: "Game over! The Mafia has taken control of the town!", style: 'terrified' },
    town: { text: "Game over! The town has successfully eliminated all Mafia members!", style: 'cheerful' },
    joker: { text: "Game over! The Joker has won by getting themselves eliminated!", style: 'cheerful' },
  };
  
  const announcement = announcements[winner];
  return speak(announcement.text, { azureStyle: announcement.style });
}

/**
 * Speak elimination result (during day voting)
 */
export function speakEliminationResult(playerName: string, role: string): Promise<void> {
  return speak(
    `${playerName} has been eliminated by the town. They were the ${role}.`,
    { azureStyle: 'sad' }
  );
}

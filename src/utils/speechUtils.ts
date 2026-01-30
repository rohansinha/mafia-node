/**
 * Speech Utilities - Text-to-Speech functionality for game announcements
 * 
 * Uses the Web Speech API (SpeechSynthesis) to provide voice announcements
 * during gameplay, particularly for night phase role calls.
 * 
 * Features:
 * - Role-specific announcements during night phase
 * - Configurable speech rate, pitch, and volume
 * - Fallback handling for browsers without TTS support
 */

export interface SpeechOptions {
  rate?: number;      // Speech rate: 0.1 to 10 (default: 0.9)
  pitch?: number;     // Pitch: 0 to 2 (default: 1)
  volume?: number;    // Volume: 0 to 1 (default: 1)
  voice?: SpeechSynthesisVoice | null;
}

const DEFAULT_OPTIONS: SpeechOptions = {
  rate: 0.9,
  pitch: 1,
  volume: 1,
  voice: null,
};

// Track if voices have been loaded
let voicesLoaded = false;
let voicesLoadedPromise: Promise<void> | null = null;

/**
 * Check if the browser supports the Web Speech API
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Wait for voices to be loaded (required on many browsers)
 */
export function waitForVoices(): Promise<void> {
  if (!isSpeechSupported()) {
    return Promise.resolve();
  }
  
  if (voicesLoaded && window.speechSynthesis.getVoices().length > 0) {
    return Promise.resolve();
  }
  
  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }
  
  voicesLoadedPromise = new Promise((resolve) => {
    // Check if voices are already available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve();
      return;
    }
    
    // Wait for voices to load
    const handleVoicesChanged = () => {
      voicesLoaded = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve();
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // Fallback timeout - some browsers don't fire voiceschanged
    setTimeout(() => {
      voicesLoaded = true;
      resolve();
    }, 1000);
  });
  
  return voicesLoadedPromise;
}

/**
 * Get available voices (useful for selecting a preferred voice)
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Get a preferred English voice (prefers natural-sounding voices)
 */
export function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  
  if (voices.length === 0) {
    console.warn('No voices available');
    return null;
  }
  
  // Prefer English voices, prioritize ones that sound more natural
  const preferredNames = ['Google US English', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'];
  
  for (const name of preferredNames) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  // Fallback to any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) return englishVoice;
  
  // Fallback to first available voice
  return voices[0] || null;
}

/**
 * Speak the given text using the Web Speech API
 */
export async function speak(text: string, options: SpeechOptions = {}): Promise<void> {
  if (!isSpeechSupported()) {
    console.warn('Speech synthesis not supported in this browser');
    return;
  }

  // Wait for voices to be loaded first
  await waitForVoices();
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Small delay after cancel to ensure it's processed
  await new Promise(resolve => setTimeout(resolve, 100));

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    utterance.rate = mergedOptions.rate!;
    utterance.pitch = mergedOptions.pitch!;
    utterance.volume = mergedOptions.volume!;
    
    // Set voice
    const voice = mergedOptions.voice || getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      resolve(); // Resolve anyway to not block gameplay
    };

    // Chrome bug workaround: speech synthesis can get stuck
    // Resume if paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
    
    // Chrome bug workaround: keep speech alive for long utterances
    // Chrome pauses speech after ~15 seconds if the page isn't active
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive);
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    
    // Clear interval when done
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
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Night phase announcements for each role
 */
export const NIGHT_ANNOUNCEMENTS = {
  MAFIA_TEAM: "Mafia team, open your eyes and look at each other. Agree on which player to eliminate tonight. One of you will select the target on the phone. Place the phone back once done and close your eyes.",
  Mafia: "Mafia, open your eyes and take the phone to select your target. Place the phone back once done and close your eyes.",
  Godfather: "Godfather, open your eyes and take the phone to select your target. Place the phone back once done and close your eyes.",
  Hooker: "Hooker, open your eyes and take the phone to select who to roleblock tonight. Place the phone back once done and close your eyes.",
  Detective: "Detective, open your eyes and take the phone to investigate a player. Place the phone back once done and close your eyes.",
  Doctor: "Doctor, open your eyes and take the phone to protect a player tonight. Place the phone back once done and close your eyes.",
  Silencer: "Silencer, open your eyes and take the phone to silence a player for tomorrow's discussion. Place the phone back once done and close your eyes.",
} as const;

/**
 * Get the announcement text for a specific role
 */
export function getRoleAnnouncement(role: string): string {
  return NIGHT_ANNOUNCEMENTS[role as keyof typeof NIGHT_ANNOUNCEMENTS] || 
    `${role}, open your eyes and take the phone to complete your action. Place the phone back once done and close your eyes.`;
}

/**
 * Speak the night phase opening announcement
 */
export function speakNightOpening(nightNumber: number): Promise<void> {
  return speak(`Night ${nightNumber}. Everyone close your eyes.`);
}

/**
 * Speak the role turn announcement
 */
export function speakRoleTurn(role: string): Promise<void> {
  const announcement = getRoleAnnouncement(role);
  return speak(announcement);
}

/**
 * Speak the end of night announcement
 */
export function speakNightEnding(): Promise<void> {
  return speak("All players may now open your eyes. The sun is rising.");
}

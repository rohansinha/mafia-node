/**
 * useSpeech Hook - React hook for text-to-speech functionality
 * 
 * Provides easy access to speech synthesis in React components
 * with automatic cleanup on unmount.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  speak, 
  stopSpeaking, 
  isSpeechSupported, 
  speakRoleTurn,
  speakNightOpening,
  speakNightEnding,
  waitForVoices,
  SpeechOptions 
} from '@/utils/speechUtils';

interface UseSpeechReturn {
  /** Whether speech synthesis is supported in the current browser */
  isSupported: boolean;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Whether speech is enabled by the user */
  isEnabled: boolean;
  /** Whether voices have been loaded */
  isReady: boolean;
  /** Toggle speech on/off */
  toggleSpeech: () => void;
  /** Enable speech */
  enableSpeech: () => void;
  /** Disable speech */
  disableSpeech: () => void;
  /** Speak arbitrary text */
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  /** Stop current speech */
  stop: () => void;
  /** Speak the night phase opening */
  announceNightOpening: (nightNumber: number) => Promise<void>;
  /** Speak a role's turn announcement */
  announceRoleTurn: (role: string) => Promise<void>;
  /** Speak the night ending announcement */
  announceNightEnding: () => Promise<void>;
  /** Test speech with a short message */
  testSpeech: () => Promise<void>;
}

export function useSpeech(): UseSpeechReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Check for speech support and load voices on mount
  useEffect(() => {
    const supported = isSpeechSupported();
    setIsSupported(supported);
    
    if (supported) {
      // Pre-load voices
      waitForVoices().then(() => {
        setIsReady(true);
        console.log('Speech synthesis ready, voices loaded');
      });
    }
    
    // Load preference from localStorage
    if (typeof window !== 'undefined') {
      const savedPreference = localStorage.getItem('mafia-speech-enabled');
      if (savedPreference !== null) {
        setIsEnabled(savedPreference === 'true');
      }
    }
  }, []);

  // Save preference to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia-speech-enabled', String(isEnabled));
    }
  }, [isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const toggleSpeech = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const enableSpeech = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableSpeech = useCallback(() => {
    setIsEnabled(false);
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string, options?: SpeechOptions) => {
    if (!isEnabled || !isSupported) return;
    
    setIsSpeaking(true);
    try {
      await speak(text, options);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isSupported]);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const announceNightOpening = useCallback(async (nightNumber: number) => {
    if (!isEnabled || !isSupported) return;
    
    setIsSpeaking(true);
    try {
      await speakNightOpening(nightNumber);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isSupported]);

  const announceRoleTurn = useCallback(async (role: string) => {
    if (!isEnabled || !isSupported) return;
    
    setIsSpeaking(true);
    try {
      await speakRoleTurn(role);
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isSupported]);

  const announceNightEnding = useCallback(async () => {
    if (!isEnabled || !isSupported) return;
    
    setIsSpeaking(true);
    try {
      await speakNightEnding();
    } finally {
      setIsSpeaking(false);
    }
  }, [isEnabled, isSupported]);

  const testSpeech = useCallback(async () => {
    if (!isSupported) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    setIsSpeaking(true);
    try {
      await speak('Voice announcements are working.');
    } finally {
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    isEnabled,
    isReady,
    toggleSpeech,
    enableSpeech,
    disableSpeech,
    speak: speakText,
    stop,
    announceNightOpening,
    announceRoleTurn,
    announceNightEnding,
    testSpeech,
  };
}

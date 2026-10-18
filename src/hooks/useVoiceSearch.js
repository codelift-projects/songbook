import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for mobile & desktop voice search.
 * Leverages native Web Speech API (Chrome / Android / Edge / Safari)
 * with graceful fallback to keyboard voice input.
 */
export function useVoiceSearch({ onResult, onListeningChange, inputRef, defaultLang = 'hi-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null;

    setIsSupported(Boolean(SpeechRecognition));

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    onListeningChange?.(false);
  }, [onListeningChange]);

  const startListening = useCallback((langCode) => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null;

    if (!SpeechRecognition) {
      // If browser doesn't have Web Speech API, focus search input so mobile keyboard's mic can be used
      if (inputRef?.current) {
        inputRef.current.focus();
      }
      return false;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Determine language
      let targetLang = langCode || defaultLang;
      if (targetLang === 'hindi') targetLang = 'hi-IN';
      else if (targetLang === 'marathi') targetLang = 'mr-IN';
      else if (targetLang === 'english') targetLang = 'en-US';
      recognition.lang = targetLang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        onListeningChange?.(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript) {
          // Clean up speech artifact punctuation if any
          const cleaned = transcript.trim();
          onResult?.(cleaned);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Voice search recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMessage(event.error);
        }
        setIsListening(false);
        onListeningChange?.(false);

        // Fallback: focus input so user can type or use keyboard mic
        if (inputRef?.current) {
          inputRef.current.focus();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        onListeningChange?.(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
      onListeningChange?.(false);
      if (inputRef?.current) {
        inputRef.current.focus();
      }
      return false;
    }
  }, [defaultLang, inputRef, onListeningChange, onResult]);

  const toggleListening = useCallback((langCode) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(langCode);
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}

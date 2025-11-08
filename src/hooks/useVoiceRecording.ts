import { useState, useRef, useEffect } from 'react';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Show interim results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      console.log('🎤 Recognition event triggered');
      
      // Get the latest result
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;
      
      console.log('🎤 Speech recognized:', transcript);
      console.log('🎤 Is final:', isFinal);
      console.log('Confidence:', event.results[last][0].confidence);
      
      // Update transcript with interim results
      if (isFinal) {
        console.log('🎤 Final transcript, setting state...');
        setTranscript(transcript);
      } else {
        console.log('🎤 Interim result:', transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      console.error('Error details:', event);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsRecording(false);
    };

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started successfully');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      console.log('🎙️ Starting voice recording...');
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      console.log('🛑 Manually stopping recording...');
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  };
}

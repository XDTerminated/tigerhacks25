import { useState, useEffect, useRef } from "react";
import { useVoiceRecording } from "./hooks/useVoiceRecording";
import { getChatResponse } from "./services/gemini";
import { textToSpeech } from "./services/elevenlabs";
import { VOICES } from "./data/voices";
import "./App.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [textInput, setTextInput] = useState("");
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const { isRecording, transcript, startRecording, stopRecording } = useVoiceRecording();
    const audioRef = useRef<HTMLAudioElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const currentVoice = VOICES[currentVoiceIndex];

    // Handle arrow key navigation for voice selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent spacebar if typing in input
            if (e.key === " " && e.target instanceof HTMLInputElement) {
                return;
            }

            if (e.key === " ") {
                e.preventDefault();
                if (!isRecording && !isProcessing && !isPlayingAudio) {
                    startRecording();
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentVoiceIndex((prev) => (prev === 0 ? VOICES.length - 1 : prev - 1));
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCurrentVoiceIndex((prev) => (prev === VOICES.length - 1 ? 0 : prev + 1));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Prevent spacebar if typing in input
            if (e.key === " " && e.target instanceof HTMLInputElement) {
                return;
            }

            if (e.key === " ") {
                e.preventDefault();
                if (isRecording) {
                    stopRecording();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [isRecording, isProcessing, isPlayingAudio, startRecording, stopRecording]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const processTranscript = async () => {
            console.log("📝 Transcript changed:", transcript, "Recording:", isRecording);
            // Only process if we have a new transcript, not recording, and haven't processed this exact transcript
            if (transcript && !isRecording && transcript !== lastProcessedTranscript) {
                console.log("✅ Processing new transcript:", transcript);
                setLastProcessedTranscript(transcript);
                handleUserMessage(transcript);
            }
        };
        processTranscript();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript, isRecording]);

    const handleUserMessage = async (userMessage: string) => {
        if (!userMessage.trim() || isProcessing) return;

        console.log("🎤 User message received:", userMessage);
        setIsProcessing(true);
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

        try {
            // Get AI response
            console.log("🤖 Requesting AI response...");
            const aiResponse = await getChatResponse(userMessage, {
                planetName: currentVoice.planetName,
                avgTemp: currentVoice.avgTemp,
                planetColor: currentVoice.planetColor,
                oceanCoverage: currentVoice.oceanCoverage,
                gravity: currentVoice.gravity,
                name: currentVoice.name,
                isResearcher: currentVoice.isResearcher,
                correctFacts: currentVoice.correctFacts,
            });
            console.log("✅ AI response received:", aiResponse);
            setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

            // Convert to speech and play
            console.log("🔊 Converting text to speech...");
            const audioUrl = await textToSpeech(aiResponse, currentVoice.id);
            console.log("✅ Audio URL generated:", audioUrl);

            if (audioRef.current) {
                console.log("🎵 Setting audio source and attempting to play...");
                audioRef.current.src = audioUrl;
                setIsPlayingAudio(true);
                try {
                    await audioRef.current.play();
                    console.log("✅ Audio playback started successfully!");
                } catch (playError) {
                    console.error("❌ Audio play error:", playError);
                }
            } else {
                console.error("❌ Audio ref is null!");
            }
        } catch (error) {
            console.error("❌ Error processing message:", error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAudioEnded = () => {
        console.log("🔇 Audio playback ended");
        setIsPlayingAudio(false);
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleMicMouseDown = () => {
        if (!isProcessing && !isPlayingAudio) {
            startRecording();
        }
    };

    const handleMicMouseUp = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    const handleMicTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        if (!isProcessing && !isPlayingAudio) {
            startRecording();
        }
    };

    const handleMicTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        }
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            handleUserMessage(textInput);
            setTextInput("");
        }
    };

    const testAPIs = async () => {
        console.log("🧪 Testing API connections...");
        console.log("Gemini API Key:", import.meta.env.VITE_GEMINI_API_KEY ? "✅ Set" : "❌ Missing");
        console.log("ElevenLabs API Key:", import.meta.env.VITE_ELEVENLABS_API_KEY ? "✅ Set" : "❌ Missing");
        console.log("Current Voice:", currentVoice.name);

        try {
            await handleUserMessage("Hello, can you hear me?");
        } catch (error) {
            console.error("❌ API test failed:", error);
        }
    };

    const handleVoiceChange = (direction: "prev" | "next") => {
        if (direction === "prev") {
            setCurrentVoiceIndex((prev) => (prev === 0 ? VOICES.length - 1 : prev - 1));
        } else {
            setCurrentVoiceIndex((prev) => (prev === VOICES.length - 1 ? 0 : prev + 1));
        }
    };

    return (
        <div className="app">
            <div className="middle-section">
                <img src="/Assets/Database.png" alt="Database" className="database-image" />
                <img src="/Assets/Window.png" alt="Window" className="window-image" />
                <img src="/Assets/OtherScreen.png" alt="Other Screen" className="other-screen-image" />
            </div>
            <div className="bottom-section">
                <img src="/Assets/BrokenGeolocator.png" alt="Broken Geolocator" className="geolocator-image" />
                <img src="/Assets/SelectorBase.png" alt="Selector Base" className="selector-base-image" />
                <img src="/Assets/SelectorLeftArrow.png" alt="Selector Left Arrow" className="selector-left-arrow" />
                <img src="/Assets/SelectorRightArrow.png" alt="Selector Right Arrow" className="selector-right-arrow" />
                <img src="/Assets/RadioTransmitter.png" alt="Radio Transmitter" className="radio-image" />
            </div>
            <img src="/Assets/Base.png" alt="Base" className="base-image" />
            <audio ref={audioRef} onEnded={handleAudioEnded} style={{ display: "none" }} />
        </div>
    );
}

export default App;

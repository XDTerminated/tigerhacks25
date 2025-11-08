import { useState, useEffect, useRef, useCallback } from "react";
import { useVoiceRecording } from "./hooks/useVoiceRecording";
import { getChatResponse } from "./services/gemini";
import { textToSpeech } from "./services/elevenlabs";
import type { Voice } from "./data/voices";
import { generateRandomPlanets, getBaseColorFromDescription } from "./utils/planetGenerator";
import "./App.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

function App() {
    const [planets, setPlanets] = useState<Voice[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [textInput, setTextInput] = useState("");
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
    const [databasePlanetIndex, setDatabasePlanetIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [removedPlanets, setRemovedPlanets] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const { isRecording, transcript, startRecording, stopRecording } = useVoiceRecording();
    const audioRef = useRef<HTMLAudioElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Generate random planets on component mount
    useEffect(() => {
        const randomPlanets = generateRandomPlanets(10);
        setPlanets(randomPlanets);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const currentVoice = planets.length > 0 ? planets[currentVoiceIndex] : null;

    const handleVoiceChange = useCallback((direction: "prev" | "next") => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingAudio(false);
        }
        
        setIsTransitioning(true);
        setTimeout(() => {
            let nextIndex = currentVoiceIndex;
            let attempts = 0;
            const maxAttempts = planets.length;

            // Find the next non-removed planet
            do {
                if (direction === "prev") {
                    nextIndex = nextIndex === 0 ? planets.length - 1 : nextIndex - 1;
                } else {
                    nextIndex = nextIndex === planets.length - 1 ? 0 : nextIndex + 1;
                }
                attempts++;
            } while (removedPlanets.includes(nextIndex) && attempts < maxAttempts);

            // Only update if we found a non-removed planet
            if (!removedPlanets.includes(nextIndex)) {
                setCurrentVoiceIndex(nextIndex);
            }
            
            setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
    }, [currentVoiceIndex, removedPlanets, planets.length]);

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
                handleVoiceChange("prev");
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleVoiceChange("next");
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
    }, [isRecording, isProcessing, isPlayingAudio, startRecording, stopRecording, handleVoiceChange]);

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
        if (!userMessage.trim() || isProcessing || !currentVoice) return;

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
        if (!currentVoice) return;
        
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

    const handleDatabaseClick = () => {
        console.log("Database clicked!");
        setIsDatabaseOpen(true);
        // Keep the previously viewed planet, don't reset to 0
    };

    const handleCloseDatabaseModal = () => {
        setIsDatabaseOpen(false);
        // databasePlanetIndex stays at its current value
    };

    const handleDatabasePlanetChange = (direction: "prev" | "next") => {
        if (direction === "prev") {
            setDatabasePlanetIndex((prev) => (prev === 0 ? planets.length - 1 : prev - 1));
        } else {
            setDatabasePlanetIndex((prev) => (prev === planets.length - 1 ? 0 : prev + 1));
        }
    };

    const handleRemoveCurrentPlanet = () => {
        // Add current planet to removed list
        if (!removedPlanets.includes(currentVoiceIndex)) {
            // Start delete animation
            setIsDeleting(true);
            
            setTimeout(() => {
                const newRemovedPlanets = [...removedPlanets, currentVoiceIndex];
                setRemovedPlanets(newRemovedPlanets);
                
                // Find next available planet
                let nextIndex = currentVoiceIndex;
                let attempts = 0;
                const maxAttempts = planets.length;

                do {
                    nextIndex = nextIndex === planets.length - 1 ? 0 : nextIndex + 1;
                    attempts++;
                } while (newRemovedPlanets.includes(nextIndex) && attempts < maxAttempts);

                // Move to next available planet if one exists
                if (!newRemovedPlanets.includes(nextIndex)) {
                    setCurrentVoiceIndex(nextIndex);
                }
                
                // End delete animation
                setTimeout(() => setIsDeleting(false), 50);
            }, 500); // Duration of delete animation
        }
    };

    const handleGoToDatabasePlanet = () => {
        setCurrentVoiceIndex(databasePlanetIndex);
        setIsDatabaseOpen(false);
    };

    const databasePlanet = planets.length > 0 ? planets[databasePlanetIndex] : null;

    // Don't render until planets are loaded
    if (!currentVoice || !databasePlanet) {
        return <div className="app">Loading planets...</div>;
    }

    return (
        <div className="app">
            {isDatabaseOpen && (
                <div className="database-modal-overlay" onClick={handleCloseDatabaseModal}>
                    <div className="database-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={handleCloseDatabaseModal}>✕</button>
                        <div className="database-modal-content">
                            <h2>Planetary Database</h2>
                            <div className="database-layout">
                                {/* Left side: Stats and Info */}
                                <div className="database-left-panel">
                                    <h3 className="database-planet-name">{databasePlanet.planetName}</h3>
                                    <div className="database-researcher">Researcher: {databasePlanet.name}</div>
                                    <div className="database-stats">
                                        <div className="database-stat-row">
                                            <span className="stat-label-db">Temperature:</span>
                                            <span className="stat-value-db">{databasePlanet.avgTemp}</span>
                                        </div>
                                        <div className="database-stat-row">
                                            <span className="stat-label-db">Color:</span>
                                            <span className="stat-value-db">{databasePlanet.planetColor}</span>
                                        </div>
                                        <div className="database-stat-row">
                                            <span className="stat-label-db">Ocean Coverage:</span>
                                            <span className="stat-value-db">{databasePlanet.oceanCoverage}</span>
                                        </div>
                                        <div className="database-stat-row">
                                            <span className="stat-label-db">Gravity:</span>
                                            <span className="stat-value-db">{databasePlanet.gravity}</span>
                                        </div>
                                    </div>
                                    <div className="database-planet-counter">
                                        Planet {databasePlanetIndex + 1} of {planets.length}
                                    </div>
                                </div>
                                
                                {/* Right side: Planet Visualization */}
                                <div className="database-right-panel">
                                    <svg viewBox="0 0 200 200" className="database-planet-svg">
                                        <defs>
                                            <radialGradient id={`dbPlanetGradient-${databasePlanetIndex}`}>
                                                <stop offset="0%" stopColor={getBaseColorFromDescription(databasePlanet.planetColor)} stopOpacity="1" />
                                                <stop offset="70%" stopColor={getBaseColorFromDescription(databasePlanet.planetColor)} stopOpacity="0.8" />
                                                <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                                            </radialGradient>
                                            <pattern id={`dbPattern-${databasePlanetIndex}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                                {databasePlanet.planetName.includes('Earth') && (
                                                    <>
                                                        <circle cx="5" cy="5" r="3" fill="#228B22" opacity="0.6" />
                                                        <circle cx="15" cy="15" r="4" fill="#228B22" opacity="0.5" />
                                                    </>
                                                )}
                                                {parseInt(databasePlanet.oceanCoverage) > 70 && !databasePlanet.planetName.includes('Earth') && (
                                                    <>
                                                        <path d="M0,10 Q5,8 10,10 T20,10" stroke="rgba(255,255,255,0.3)" fill="none" strokeWidth="1"/>
                                                        <path d="M0,15 Q5,13 10,15 T20,15" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth="1"/>
                                                    </>
                                                )}
                                                {(databasePlanet.planetColor.toLowerCase().includes('frost') || databasePlanet.planetColor.toLowerCase().includes('icy')) && (
                                                    <>
                                                        <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                                                        <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                                                        <line x1="0" y1="15" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                                                    </>
                                                )}
                                                {databasePlanet.planetColor.toLowerCase().includes('cloud') && (
                                                    <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)"/>
                                                )}
                                                {databasePlanet.planetColor.toLowerCase().includes('streak') && (
                                                    <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2"/>
                                                )}
                                                {databasePlanet.planetColor.toLowerCase().includes('ridge') && (
                                                    <>
                                                        <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)"/>
                                                        <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)"/>
                                                    </>
                                                )}
                                            </pattern>
                                        </defs>
                                        <circle 
                                            cx="100" 
                                            cy="100" 
                                            r="70" 
                                            fill={`url(#dbPlanetGradient-${databasePlanetIndex})`}
                                            stroke={getBaseColorFromDescription(databasePlanet.planetColor)}
                                            strokeWidth="2"
                                            opacity="0.9"
                                        />
                                        <circle 
                                            cx="100" 
                                            cy="100" 
                                            r="70" 
                                            fill={`url(#dbPattern-${databasePlanetIndex})`}
                                            opacity="0.7"
                                        />
                                        {databasePlanet.planetName.includes('Erythos') && (
                                            <>
                                                <ellipse cx="70" cy="85" rx="12" ry="15" fill="rgba(139,0,0,0.4)" />
                                                <ellipse cx="120" cy="105" rx="15" ry="10" fill="rgba(139,0,0,0.3)" />
                                            </>
                                        )}
                                        {databasePlanet.planetName.includes('Zenthara') && (
                                            <>
                                                <circle cx="80" cy="95" r="8" fill="rgba(60,20,10,0.5)" />
                                                <circle cx="110" cy="110" r="6" fill="rgba(60,20,10,0.4)" />
                                                <circle cx="95" cy="80" r="5" fill="rgba(60,20,10,0.3)" />
                                            </>
                                        )}
                                        {databasePlanet.planetName.includes('Kalmora') && (
                                            <>
                                                <ellipse cx="85" cy="90" rx="18" ry="22" fill="rgba(34,139,34,0.5)" />
                                                <ellipse cx="115" cy="110" rx="15" ry="18" fill="rgba(34,139,34,0.4)" />
                                            </>
                                        )}
                                        <circle 
                                            cx="100" 
                                            cy="100" 
                                            r="75" 
                                            fill="none"
                                            stroke={getBaseColorFromDescription(databasePlanet.planetColor)}
                                            strokeWidth="1"
                                            opacity="0.3"
                                        />
                                    </svg>
                                </div>
                            </div>
                            
                            {/* Navigation arrows at bottom */}
                            <div className="database-navigation">
                                <button 
                                    className="database-nav-btn" 
                                    onClick={() => handleDatabasePlanetChange("prev")}
                                >
                                    ◄
                                </button>
                                <button 
                                    className="database-nav-btn" 
                                    onClick={() => handleDatabasePlanetChange("next")}
                                >
                                    ►
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="middle-section">
                <img 
                    src="/Assets/Database.png" 
                    alt="Database" 
                    className="database-image" 
                    onClick={handleDatabaseClick}
                />
                <div className="window-container">
                    <img src="/Assets/Window.png" alt="Window" className="window-image" />
                    <div className={`planet-display ${isTransitioning ? 'transitioning' : ''} ${isDeleting ? 'deleting' : ''}`}>
                        <svg viewBox="0 0 200 200" className="planet-svg">
                            {/* Planet circle */}
                            <defs>
                                <radialGradient id={`planetGradient-${currentVoiceIndex}`}>
                                    <stop offset="0%" stopColor={getBaseColorFromDescription(currentVoice.planetColor)} stopOpacity="1" />
                                    <stop offset="70%" stopColor={getBaseColorFromDescription(currentVoice.planetColor)} stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                                </radialGradient>
                                {/* Pattern for different planet types */}
                                <pattern id={`pattern-${currentVoiceIndex}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                    {currentVoice.planetName.includes('Earth') && (
                                        <>
                                            <circle cx="5" cy="5" r="3" fill="#228B22" opacity="0.6" />
                                            <circle cx="15" cy="15" r="4" fill="#228B22" opacity="0.5" />
                                        </>
                                    )}
                                    {parseInt(currentVoice.oceanCoverage) > 70 && !currentVoice.planetName.includes('Earth') && (
                                        <>
                                            <path d="M0,10 Q5,8 10,10 T20,10" stroke="rgba(255,255,255,0.3)" fill="none" strokeWidth="1"/>
                                            <path d="M0,15 Q5,13 10,15 T20,15" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth="1"/>
                                        </>
                                    )}
                                    {currentVoice.planetColor.toLowerCase().includes('frost') || currentVoice.planetColor.toLowerCase().includes('icy') && (
                                        <>
                                            <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                                            <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                                            <line x1="0" y1="15" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                                        </>
                                    )}
                                    {currentVoice.planetColor.toLowerCase().includes('cloud') && (
                                        <>
                                            <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)"/>
                                        </>
                                    )}
                                    {currentVoice.planetColor.toLowerCase().includes('streak') && (
                                        <>
                                            <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2"/>
                                        </>
                                    )}
                                    {currentVoice.planetColor.toLowerCase().includes('ridge') && (
                                        <>
                                            <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)"/>
                                            <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)"/>
                                        </>
                                    )}
                                </pattern>
                            </defs>
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="70" 
                                fill={`url(#planetGradient-${currentVoiceIndex})`}
                                stroke={getBaseColorFromDescription(currentVoice.planetColor)}
                                strokeWidth="2"
                                opacity="0.9"
                            />
                            {/* Apply pattern overlay */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="70" 
                                fill={`url(#pattern-${currentVoiceIndex})`}
                                opacity="0.7"
                            />
                            {/* Add some random surface features based on planet name */}
                            {currentVoice.planetName.includes('Erythos') && (
                                <>
                                    <ellipse cx="70" cy="85" rx="12" ry="15" fill="rgba(139,0,0,0.4)" />
                                    <ellipse cx="120" cy="105" rx="15" ry="10" fill="rgba(139,0,0,0.3)" />
                                </>
                            )}
                            {currentVoice.planetName.includes('Zenthara') && (
                                <>
                                    <circle cx="80" cy="95" r="8" fill="rgba(60,20,10,0.5)" />
                                    <circle cx="110" cy="110" r="6" fill="rgba(60,20,10,0.4)" />
                                    <circle cx="95" cy="80" r="5" fill="rgba(60,20,10,0.3)" />
                                </>
                            )}
                            {currentVoice.planetName.includes('Kalmora') && (
                                <>
                                    <ellipse cx="85" cy="90" rx="18" ry="22" fill="rgba(34,139,34,0.5)" />
                                    <ellipse cx="115" cy="110" rx="15" ry="18" fill="rgba(34,139,34,0.4)" />
                                </>
                            )}
                            {/* Atmosphere glow */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="75" 
                                fill="none"
                                stroke={getBaseColorFromDescription(currentVoice.planetColor)}
                                strokeWidth="1"
                                opacity="0.3"
                            />
                        </svg>
                    </div>
                </div>
                <div className="other-screen-container">
                    <img src="/Assets/OtherScreen.png" alt="Other Screen" className="other-screen-image" />
                    <div className={`screen-text ${isTransitioning ? 'transitioning' : ''} ${isDeleting ? 'deleting' : ''}`}>
                        <div className="screen-planet-wrapper">
                            <div className="screen-planet-name">PLANET {currentVoiceIndex + 1}</div>
                            {isPlayingAudio && (
                                <div className="audio-wave">
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                    <div className="wave-bar"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="bottom-section">
                <img src="/Assets/BrokenGeolocator.png" alt="Broken Geolocator" className="geolocator-image" />
                {isRecording && <div className="green-recording-light"></div>}
                <img src="/Assets/SelectorBase.png" alt="Selector Base" className="selector-base-image" />
                <img
                    src="/Assets/SelectorLeftArrow.png"
                    alt="Selector Left Arrow"
                    className="selector-left-arrow"
                    onClick={() => handleVoiceChange("prev")}
                />
                <div className="selector-center-buttons">
                    <button 
                        className="selector-action-btn remove-btn"
                        onClick={handleRemoveCurrentPlanet}
                        title="Remove planet from call list"
                        disabled={removedPlanets.includes(currentVoiceIndex)}
                    >
                        ✕
                    </button>
                    {isDatabaseOpen && (
                        <button 
                            className="selector-action-btn goto-btn"
                            onClick={handleGoToDatabasePlanet}
                            title="Go to selected database planet"
                        >
                            →
                        </button>
                    )}
                </div>
                <img
                    src="/Assets/SelectorRightArrow.png"
                    alt="Selector Right Arrow"
                    className="selector-right-arrow"
                    onClick={() => handleVoiceChange("next")}
                />
                <img src="/Assets/RadioTransmitter.png" alt="Radio Transmitter" className="radio-image" />
                {isProcessing && (
                    <div className="wifi-loading">
                        <div className="wifi-arc wifi-arc-1"></div>
                        <div className="wifi-arc wifi-arc-2"></div>
                        <div className="wifi-arc wifi-arc-3"></div>
                        <div className="wifi-dot"></div>
                    </div>
                )}
            </div>
            <img src="/Assets/Base.png" alt="Base" className="base-image" />
            <audio ref={audioRef} onEnded={handleAudioEnded} style={{ display: "none" }} />
        </div>
    );
}

export default App;

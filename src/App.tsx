import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useVoiceRecording } from "./hooks/useVoiceRecording";
import { getChatResponse } from "./services/gemini";
import { textToSpeech } from "./services/elevenlabs";
import type { Voice } from "./data/voices";
import { generateRandomPlanets, getBaseColorFromDescription } from "./utils/planetGenerator";
import { useUser } from "./contexts/UserContext";
import { addChatMessage, updatePlayerStats, createGameSession, endGameSession, saveGameChatLog, getResearcherChatLogs } from "./services/api";
import { IntroScene } from "./IntroScene";
import DashboardScreen from "./DashboardScreen";
import GameSessionDetail from "./GameSessionDetail";
import "./App.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatLog {
    gameId: string;
    timestamp: number;
    researcherName: string;
    planetName: string;
    messages: Message[];
    outcome?: "win" | "lose";
}

interface ResearcherChatLogs {
    [researcherName: string]: ChatLog[];
}

interface GameSession {
    gameId: string;
    startTime: number;
    chatsByPlanet: { [planetName: string]: Message[] };
}

function App() {
    // Trigger planet animation when game scene first loads
    const { logout, user } = useAuth0();
    const { refreshStats, playerStats, isLoading: userLoading } = useUser();
    const [showIntro, setShowIntro] = useState<boolean | null>(null); // null = checking, true = show intro, false = skip intro
    const [introComplete, setIntroComplete] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    // Initialize planets synchronously so they're available on first render
    const [planets, setPlanets] = useState<Voice[]>(() => generateRandomPlanets(5));
    // Create randomized order for database display
    const [databaseOrder, setDatabaseOrder] = useState<number[]>(() => {
        const indices = Array.from({ length: 5 }, (_, i) => i);
        return indices.sort(() => Math.random() - 0.5);
    });
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
    const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
    const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
    const [databasePlanetIndex, setDatabasePlanetIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPlanetEntering, setIsPlanetEntering] = useState(false);
    const [removedPlanets, setRemovedPlanets] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [gameOver, setGameOver] = useState<"win" | "lose" | "oxygen" | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);
    const [isTransmitterClose, setIsTransmitterClose] = useState(false);
    const [arrowTooltipPosition, setArrowTooltipPosition] = useState({
        x: 0,
        y: 0,
    });
    const [showArrowTooltip, setShowArrowTooltip] = useState<"prev" | "next" | null>(null);
    const [buttonTooltipPosition, setButtonTooltipPosition] = useState({
        x: 0,
        y: 0,
    });
    const [showButtonTooltip, setShowButtonTooltip] = useState<"eject" | "choose" | null>(null);
    // Initialize game session synchronously
    const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(() => {
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
            gameId,
            startTime: Date.now(),
            chatsByPlanet: {},
        };
    });
    const [isChatLogOpen, setIsChatLogOpen] = useState(false);
    const [allChatLogs, setAllChatLogs] = useState<ChatLog[]>([]);
    const [nameTooltipPosition, setNameTooltipPosition] = useState({ x: 0, y: 0 });
    const [showNameTooltip, setShowNameTooltip] = useState(false);
    const [oxygenLevel, setOxygenLevel] = useState(0.3); // Start at 30%
    const [flashRed, setFlashRed] = useState(false);
    const { isRecording, transcript, startRecording, stopRecording } = useVoiceRecording();
    const audioRef = useRef<HTMLAudioElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processingAudioRef = useRef<HTMLAudioElement | null>(null);
    const oxygenTimerRef = useRef<number | null>(null);

    const lastMultipleOf5Ref = useRef<number>(30); // Track last multiple of 5 we crossed
    const gameSessionCreatedRef = useRef<string | null>(null); // Track which game session was created in backend
    const hasInitializedRef = useRef<boolean>(false); // Track if we've already initialized on page load

    // Check if user is new and decide whether to show intro or dashboard
    useEffect(() => {
        // Only run this initialization once on initial page load
        if (hasInitializedRef.current) {
            return;
        }

        // Wait until playerStats are loaded
        if (userLoading || !playerStats) {
            return;
        }

        // Mark as initialized so this doesn't run again
        hasInitializedRef.current = true;

        // Check if user has never played before (all stats are 0)
        const isNewUser =
            playerStats.correct_guesses === 0 &&
            playerStats.correct_ejections === 0 &&
            playerStats.incorrect_guesses === 0;

        if (isNewUser) {
            // New user: show intro
            setShowIntro(true);
        } else {
            // Returning user on page load: show dashboard
            setShowIntro(false);
            setIntroComplete(true);
            setShowDashboard(true);
        }

        console.log(isNewUser ? '🆕 New user detected - showing intro' : '👋 Returning user - showing dashboard');
    }, [playerStats, userLoading]);

    const handleIntroComplete = () => {
        setShowIntro(false);
        setIntroComplete(true);
        // Make sure we don't show dashboard after intro completes
        setShowDashboard(false);
    };

    // Create backend session when user becomes available
    useEffect(() => {
        if (user?.email && currentGameSession && gameSessionCreatedRef.current !== currentGameSession.gameId) {
            gameSessionCreatedRef.current = currentGameSession.gameId; // Mark as created immediately
            createGameSession(currentGameSession.gameId, user.email)
                .then(() => console.log("🎮 Game session created in backend:", currentGameSession.gameId))
                .catch((error) => {
                    console.error("❌ Failed to create game session:", error);
                    gameSessionCreatedRef.current = null; // Reset on error so it can retry
                });
        }
    }, [user?.email, currentGameSession]); // Run when user loads or game session changes

    // Define currentVoice before using it in hooks
    const currentVoice = planets.length > 0 ? planets[currentVoiceIndex] : null;

    // Oxygen depletion timer - natural decay
    useEffect(() => {
        // Only deplete oxygen if game is not over AND intro is complete
        if (gameOver || showIntro) {
            if (oxygenTimerRef.current) {
                clearInterval(oxygenTimerRef.current);
                oxygenTimerRef.current = null;
            }
            return;
        }

        // Natural depletion rate: 0.3 (30%) over 6 minutes = 360 seconds
        // Rate per second: 0.3 / 360 = 0.0008333
        // Update every 100ms, so rate per update: 0.0008333 / 10 = 0.00008333
        const depletionRate = 0.00008333;

        oxygenTimerRef.current = window.setInterval(() => {
            setOxygenLevel((prevLevel) => {
                const newLevel = Math.max(0, prevLevel - depletionRate);
                
                // Check if we crossed a multiple of 5
                const prevPercentage = Math.floor(prevLevel * 100);
                const newPercentage = Math.floor(newLevel * 100);
                
                if (prevPercentage !== newPercentage && newPercentage % 5 === 0 && newPercentage < lastMultipleOf5Ref.current) {
                    lastMultipleOf5Ref.current = newPercentage;
                    setFlashRed(true);
                    setTimeout(() => setFlashRed(false), 5000);
                }
                
                // Check if oxygen depleted
                if (newLevel <= 0 && !gameOver) {
                    setGameOver("oxygen");
                    return 0;
                }
                
                return newLevel;
            });
        }, 100);

        return () => {
            if (oxygenTimerRef.current) {
                clearInterval(oxygenTimerRef.current);
                oxygenTimerRef.current = null;
            }
        };
    }, [gameOver, showIntro]);

    // Note: Messages are now saved directly in handleUserMessage to prevent race conditions
    // when switching planets while a conversation is in progress

    // Function to save all chat logs to localStorage
    const saveChatLogs = useCallback(
        (outcome?: "win" | "lose", selectedPlanetIndex?: number) => {
            if (!currentGameSession || !planets.length) return;

            const logs: ChatLog[] = [];

            // Save chat logs for each planet that was talked to
            planets.forEach((planet, index) => {
                const planetMessages = currentGameSession.chatsByPlanet[planet.name];
                if (planetMessages && planetMessages.length > 0) {
                    // Only assign outcome to the selected planet
                    const planetOutcome = selectedPlanetIndex !== undefined && index === selectedPlanetIndex ? outcome : undefined;

                    logs.push({
                        gameId: currentGameSession.gameId,
                        timestamp: currentGameSession.startTime,
                        researcherName: planet.name,
                        planetName: planet.planetName,
                        messages: planetMessages,
                        outcome: planetOutcome,
                    });
                }
            });

            if (logs.length > 0) {
                // Get existing logs from localStorage (organized by researcher)
                const existingLogsStr = localStorage.getItem("chatLogsByResearcher");
                const existingLogsByResearcher: ResearcherChatLogs = existingLogsStr ? JSON.parse(existingLogsStr) : {};

                // Add new logs to the structure, organized by researcher name
                logs.forEach((log) => {
                    if (!existingLogsByResearcher[log.researcherName]) {
                        existingLogsByResearcher[log.researcherName] = [];
                    }
                    existingLogsByResearcher[log.researcherName].push(log);
                });

                // Save back to localStorage
                localStorage.setItem("chatLogsByResearcher", JSON.stringify(existingLogsByResearcher));
                console.log(`Saved ${logs.length} chat logs for game ${currentGameSession.gameId}`);
            }
        },
        [currentGameSession, planets]
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleVoiceChange = useCallback(
        (direction: "prev" | "next") => {
            // Save current conversation before switching
            if (currentVoice && currentGameSession && messages.length > 0) {
                setCurrentGameSession((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        chatsByPlanet: {
                            ...prev.chatsByPlanet,
                            [currentVoice.name]: [...messages],
                        },
                    };
                });
            }

            // Play transition sound
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "/Audio/Transition.mp3";
                audioRef.current.play().catch(console.error);
                audioRef.current.onended = () => {
                    setIsPlayingAudio(false);
                };
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
                    // Clear messages for the new planet (will load if they exist in session)
                    const nextPlanet = planets[nextIndex];
                    const savedMessages = currentGameSession?.chatsByPlanet[nextPlanet.name];
                    setMessages(savedMessages || []);
                }

                setTimeout(() => {
                    setIsTransitioning(false);
                    setIsPlanetEntering(true);
                    // Remove entering class after animation completes
                    setTimeout(() => setIsPlanetEntering(false), 1200);
                }, 50);
            }, 300);
        },
        [currentVoiceIndex, removedPlanets, planets, currentVoice, currentGameSession, messages]
    );

    // Handle arrow key navigation for voice selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent spacebar if typing in input
            if (e.key === " " && e.target instanceof HTMLInputElement) {
                return;
            }

            if (e.key === " ") {
                e.preventDefault();
                if (!isRecording && !isProcessing && !isPlayingAudio && isTransmitterClose) {
                    const audio = new Audio("/Audio/TransmittorOn.mp3");
                    audio.play();
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
    }, [isRecording, isProcessing, isPlayingAudio, startRecording, stopRecording, handleVoiceChange, isTransmitterClose]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle processing audio (Predialouge.mp3)
    useEffect(() => {
        if (isProcessing) {
            // Start playing the processing audio in a loop
            if (!processingAudioRef.current) {
                processingAudioRef.current = new Audio("/Audio/Predialouge.mp3");
                processingAudioRef.current.loop = true;
                processingAudioRef.current.play().catch(console.error);
            }
        } else {
            // Stop and clean up the processing audio
            if (processingAudioRef.current) {
                processingAudioRef.current.pause();
                processingAudioRef.current.currentTime = 0;
                processingAudioRef.current = null;
            }
        }
    }, [isProcessing]);

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

        // Capture the current voice at the start to prevent race conditions
        const activeVoice = currentVoice;
        const activeVoiceName = activeVoice.name;

        console.log("🎤 User message received:", userMessage);

        // Calculate oxygen cost based on message length (1-2% per message)
        const wordCount = userMessage.trim().split(/\s+/).length;
        const baseOxygenCost = 0.01 + (wordCount * 0.0005); // Start at 1% + 0.05% per word
        const oxygenCost = Math.min(baseOxygenCost, 0.02); // Cap at 2%

        // Deduct oxygen
        setOxygenLevel((prevLevel) => {
            const newLevel = Math.max(0, prevLevel - oxygenCost);
            console.log(`💨 Oxygen: ${(prevLevel * 100).toFixed(1)}% → ${(newLevel * 100).toFixed(1)}% (cost: ${(oxygenCost * 100).toFixed(1)}% for ${wordCount} words)`);

            // Check if we crossed a multiple of 5
            const prevPercentage = Math.floor(prevLevel * 100);
            const newPercentage = Math.floor(newLevel * 100);

            if (prevPercentage !== newPercentage && newPercentage % 5 === 0 && newPercentage < lastMultipleOf5Ref.current) {
                lastMultipleOf5Ref.current = newPercentage;
                setFlashRed(true);
                setTimeout(() => setFlashRed(false), 5000);
            }

            // Check if oxygen depleted
            if (newLevel <= 0 && !gameOver) {
                setGameOver("oxygen");
            }

            return newLevel;
        });

        setIsProcessing(true);
        const userMsg: Message = { role: "user", content: userMessage };
        setMessages((prev) => [...prev, userMsg]);

        // Send user message to backend
        if (user?.email) {
            try {
                await addChatMessage(user.email, "player", userMessage);
                console.log("📤 User message sent to backend");
            } catch (error) {
                console.error("❌ Failed to send user message to backend:", error);
            }
        }

        try {
            // Get AI response
            console.log("🤖 Requesting AI response...");
            const aiResponse = await getChatResponse(userMessage, {
                planetName: activeVoice.planetName,
                avgTemp: activeVoice.avgTemp,
                planetColor: activeVoice.planetColor,
                oceanCoverage: activeVoice.oceanCoverage,
                gravity: activeVoice.gravity,
                name: activeVoice.name,
                isResearcher: activeVoice.isResearcher,
                correctFacts: activeVoice.correctFacts,
            });
            console.log("✅ AI response received:", aiResponse);
            const assistantMsg: Message = { role: "assistant", content: aiResponse };
            setMessages((prev) => [...prev, assistantMsg]);

            // Update game session with messages for the active voice
            setCurrentGameSession((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    chatsByPlanet: {
                        ...prev.chatsByPlanet,
                        [activeVoiceName]: [...(prev.chatsByPlanet[activeVoiceName] || []), userMsg, assistantMsg],
                    },
                };
            });

            // Send AI response to backend
            if (user?.email) {
                try {
                    await addChatMessage(user.email, activeVoice.name, aiResponse);
                    console.log("📤 AI response sent to backend");
                } catch (error) {
                    console.error("❌ Failed to send AI response to backend:", error);
                }
            }

            // Convert to speech and play
            console.log("🔊 Converting text to speech...");
            const audioUrl = await textToSpeech(aiResponse, activeVoice.id);
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
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                },
            ]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAudioEnded = () => {
        console.log("🔇 Audio playback ended");
        setIsPlayingAudio(false);
    };

    const handleDatabaseClick = async () => {
        console.log("Database clicked!");
        setIsDatabaseOpen(true);

        // Switch transmitter from close to far when database is opened
        if (isTransmitterClose) {
            setIsTransmitterClose(false);
        }

        // Play planetary database audio (sound effect, no wave animation)
        // Only play if not currently processing or playing chatbot audio
        if (!isProcessing && !isPlayingAudio) {
            try {
                const audio = new Audio("/Audio/Planetary.mp3");
                audio.play().catch(console.error);
            } catch (error) {
                console.error("Error playing planetary audio:", error);
            }
        }
    };

    const handleCloseDatabaseModal = () => {
        // Play button click sound (only if not playing chatbot audio)
        if (!isPlayingAudio && !isProcessing) {
            const audio = new Audio("/Audio/ButtonClick.mp3");
            audio.play().catch(console.error);
        }

        setIsDatabaseOpen(false);
        // databasePlanetIndex stays at its current value
    };

    const handleDatabasePlanetChange = (direction: "prev" | "next") => {
        // Play button click sound (only if not playing chatbot audio)
        if (!isPlayingAudio && !isProcessing) {
            const audio = new Audio("/Audio/ButtonClick.mp3");
            audio.play().catch(console.error);
        }

        if (direction === "prev") {
            setDatabasePlanetIndex((prev) => (prev === 0 ? planets.length - 1 : prev - 1));
        } else {
            setDatabasePlanetIndex((prev) => (prev === planets.length - 1 ? 0 : prev + 1));
        }
    };

    const handleRemoveCurrentPlanet = async () => {
        // Play button click sound first
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "/Audio/ButtonClick.mp3";
            audioRef.current.play().catch(console.error);
            audioRef.current.onended = () => {
                setIsPlayingAudio(false);
            };
        }

        // Add current planet to removed list
        if (!removedPlanets.includes(currentVoiceIndex)) {
            // Track correct ejection if this planet was an impostor (not the researcher)
            const planet = planets[currentVoiceIndex];
            if (user?.email && planet && !planet.isResearcher) {
                try {
                    await updatePlayerStats({
                        email: user.email,
                        correct_ejections: 1,
                    });
                    console.log("📊 Stats updated: +1 correct ejection");
                    await refreshStats();
                } catch (error) {
                    console.error("❌ Failed to update ejection stats:", error);
                }
            }

            // Start delete animation
            setIsDeleting(true);

            // Immediately remove planet without delay
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

            // End delete animation quickly
            setTimeout(() => setIsDeleting(false), 50);
        }
    };

    const handleGoToDatabasePlanet = () => {
        // Use the actual planet index from the randomized order
        const actualIndex = databaseOrder.length > 0 ? databaseOrder[databasePlanetIndex] : databasePlanetIndex;
        setCurrentVoiceIndex(actualIndex);
        setIsDatabaseOpen(false);
    };

    const handleSelectPlanet = async () => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingAudio(false);
        }

        // Check if the current planet is the researcher
        const planet = planets[currentVoiceIndex];
        const outcome = planet?.isResearcher ? "win" : "lose";

        // Save chat logs before ending game, passing the selected planet index
        saveChatLogs(outcome, currentVoiceIndex);

        // Save planet data to localStorage for dashboard display (backup for backend)
        if (currentGameSession && planet) {
            try {
                const planetDataKey = `planet_data_${currentGameSession.gameId}`;
                const planetData = {
                    planetName: planet.planetName,
                    planetColor: planet.planetColor,
                    avgTemp: planet.avgTemp,
                    oceanCoverage: planet.oceanCoverage,
                    gravity: planet.gravity,
                    outcome: outcome
                };
                localStorage.setItem(planetDataKey, JSON.stringify(planetData));
                console.log("💾 Saved planet data to localStorage:", planetData);
            } catch (error) {
                console.error("Failed to save planet data to localStorage:", error);
            }
        }

        // Save to backend and end game session
        if (user?.email && currentGameSession) {
            try {
                // Save all chat logs to backend
                const savePromises = planets.map(async (p) => {
                    const planetMessages = currentGameSession.chatsByPlanet[p.name];
                    if (planetMessages && planetMessages.length > 0) {
                        const gameChatMessages = planetMessages.map((msg, msgIndex) => ({
                            role: msg.role,
                            content: msg.content,
                            message_order: msgIndex,
                        }));

                        await saveGameChatLog(
                            currentGameSession.gameId,
                            user.email!,
                            p.name,
                            p.planetName,
                            gameChatMessages
                        );
                    }
                });

                await Promise.all(savePromises);
                console.log("💾 Game chat logs saved to backend");

                // End game session with planet properties
                console.log("🌍 Sending planet data to backend:", {
                    planetName: planet.planetName,
                    planetColor: planet.planetColor,
                    avgTemp: planet.avgTemp,
                    oceanCoverage: planet.oceanCoverage,
                    gravity: planet.gravity
                });
                await endGameSession(
                    currentGameSession.gameId,
                    outcome,
                    planet.name,
                    planet.planetName,
                    planet.planetColor,
                    planet.avgTemp,
                    planet.oceanCoverage,
                    planet.gravity
                );
                console.log("🏁 Game session ended in backend");

                // Update player stats
                if (outcome === "win") {
                    await updatePlayerStats({
                        email: user.email,
                        correct_guesses: 1,
                    });
                    console.log("📊 Stats updated: +1 correct guess");
                } else {
                    await updatePlayerStats({
                        email: user.email,
                        incorrect_guesses: 1,
                    });
                    console.log("📊 Stats updated: +1 incorrect guess");
                }

                // Refresh stats in context
                await refreshStats();
            } catch (error) {
                console.error("❌ Failed to save game data to backend:", error);
            }
        }

        setGameOver(outcome);
    };

    const handleNameClick = async () => {
        if (!currentVoice || !currentGameSession || !user?.email) return;

        try {
            // Load chat logs from backend for this researcher
            const backendLogs = await getResearcherChatLogs(user.email, currentVoice.name);
            console.log("📋 Backend chat logs for researcher:", backendLogs);

            // Convert backend format to local ChatLog format
            const researcherLogs: ChatLog[] = backendLogs.map((log) => ({
                gameId: log.game_id,
                timestamp: new Date(log.timestamp).getTime(),
                researcherName: log.researcher_name,
                planetName: log.planet_name,
                messages: log.messages.map((msg) => ({
                    role: msg.role as "user" | "assistant",
                    content: msg.content,
                })),
                outcome: log.outcome as "win" | "lose" | undefined,
            }));

            // Add current conversation to the list if there are messages
            const currentMessages = currentGameSession.chatsByPlanet[currentVoice.name];
            if (currentMessages && currentMessages.length > 0) {
                const currentLog: ChatLog = {
                    gameId: currentGameSession.gameId,
                    timestamp: currentGameSession.startTime,
                    researcherName: currentVoice.name,
                    planetName: currentVoice.planetName,
                    messages: currentMessages,
                    // No outcome for current conversation (game not ended yet)
                };

                // Add current conversation at the beginning of the array
                researcherLogs.unshift(currentLog);
            }

            console.log(`📋 Chat logs for ${currentVoice.name}:`, researcherLogs);
            console.log(`📋 Number of conversations: ${researcherLogs.length}`);

            setAllChatLogs(researcherLogs);
            setIsChatLogOpen(true);

            // Play planetary database audio when opening chat log
            const audio = new Audio("/Audio/Planetary.mp3");
            audio.play().catch(console.error);
        } catch (error) {
            console.error("❌ Failed to load researcher chat logs:", error);

            // Fallback to localStorage if backend fails
            const logsStr = localStorage.getItem("chatLogsByResearcher");
            const logsByResearcher: ResearcherChatLogs = logsStr ? JSON.parse(logsStr) : {};
            const researcherLogs = logsByResearcher[currentVoice.name] || [];

            // Add current conversation
            const currentMessages = currentGameSession.chatsByPlanet[currentVoice.name];
            if (currentMessages && currentMessages.length > 0) {
                researcherLogs.unshift({
                    gameId: currentGameSession.gameId,
                    timestamp: currentGameSession.startTime,
                    researcherName: currentVoice.name,
                    planetName: currentVoice.planetName,
                    messages: currentMessages,
                });
            }

            setAllChatLogs(researcherLogs);
            setIsChatLogOpen(true);

            // Play planetary database audio when opening chat log (fallback case)
            const audio = new Audio("/Audio/Planetary.mp3");
            audio.play().catch(console.error);
        }
    };

    const handleRestart = () => {
        // Reset game state
        setGameOver(null);

        // Return to dashboard (only after user clicks "Play Again")
        setShowDashboard(true);
        setShowIntro(false);
        setIntroComplete(true);
    };

    const handleStartNewGame = () => {
        // Reset all game state for new game
        setRemovedPlanets([]);
        setCurrentVoiceIndex(0);
        setMessages([]);
        setOxygenLevel(0.3); // Reset oxygen to 30%
        lastMultipleOf5Ref.current = 30; // Reset the multiple tracker
        setFlashRed(false);
        setShowDashboard(false);

        // Check if user is new - only show intro for brand new users
        const isNewUser = playerStats &&
            playerStats.correct_guesses === 0 &&
            playerStats.correct_ejections === 0 &&
            playerStats.incorrect_guesses === 0;

        if (isNewUser) {
            setShowIntro(true);
            setIntroComplete(false);
        } else {
            // Returning user - skip intro and go straight to game
            setShowIntro(false);
            setIntroComplete(true);
        }

        // Generate new random planets
        const randomPlanets = generateRandomPlanets(5);
        setPlanets(randomPlanets);

        // Create new randomized order for database display
        const indices = Array.from({ length: 5 }, (_, i) => i);
        const shuffledIndices = indices.sort(() => Math.random() - 0.5);
        setDatabaseOrder(shuffledIndices);

        // Initialize new game session
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentGameSession({
            gameId,
            startTime: Date.now(),
            chatsByPlanet: {},
        });

        // Create game session in backend for the new game
        if (user?.email) {
            gameSessionCreatedRef.current = gameId; // Mark as created
            createGameSession(gameId, user.email)
                .then(() => console.log("🎮 New game session created in backend:", gameId))
                .catch((error) => {
                    console.error("❌ Failed to create game session on restart:", error);
                    gameSessionCreatedRef.current = null; // Reset on error
                });
        }
    };

    const handleViewGameDetails = (gameId: string) => {
        setSelectedGameId(gameId);
        setShowDashboard(false);
    };

    const handleBackToDashboard = () => {
        setSelectedGameId(null);
        setShowDashboard(true);
    };

    const handleCloseChatLog = () => {
        // Play button click sound (only if not playing chatbot audio)
        if (!isPlayingAudio && !isProcessing) {
            const audio = new Audio("/Audio/ButtonClick.mp3");
            audio.play().catch(console.error);
        }

        setIsChatLogOpen(false);
    };

    const playHoverSound = () => {
        const audio = new Audio("/Audio/pop.mp3");
        audio.volume = 0.3; // Lower volume for hover sounds
        audio.play().catch(console.error);
    };

    // Map database index to actual planet index using randomized order
    const actualDatabasePlanetIndex = databaseOrder.length > 0 ? databaseOrder[databasePlanetIndex] : databasePlanetIndex;
    const databasePlanet = planets.length > 0 ? planets[actualDatabasePlanetIndex] : null;

    // Render the game scene content
    const gameSceneContent = (
        <div className={`app ${flashRed ? 'screen-flash-red' : ''}`}>
            <button 
                className="logout-button" 
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} 
                title="Logout"
                onMouseEnter={playHoverSound}
            >
                Logout
            </button>
            
            {/* Oxygen Bar */}
            <div className={`oxygen-bar-container ${flashRed ? 'flash-red' : ''} ${introComplete ? 'intro-complete' : ''}`}>
                <div className="oxygen-bar-label">OXYGEN</div>
                <div className="oxygen-bar-outer">
                    <div 
                        className={`oxygen-bar-fill ${flashRed ? 'flash-red' : ''} ${oxygenLevel <= 0.1 ? 'critical' : oxygenLevel <= 0.2 ? 'warning' : ''}`}
                        style={{ width: `${oxygenLevel * 100}%` }}
                    />
                </div>
                <div className="oxygen-bar-percentage">{(oxygenLevel * 100).toFixed(1)}%</div>
            </div>
            
            {isDatabaseOpen && (
                <div className="database-modal-overlay" onClick={handleCloseDatabaseModal}>
                    <div className="database-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={handleCloseDatabaseModal} onMouseEnter={playHoverSound}>
                            ✕
                        </button>
                        <div className="database-modal-content">
                            <h2>Planetary Database</h2>
                            <div>
                                {databasePlanet ? (
                                    <>
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
                                                            {databasePlanet.planetName && databasePlanet.planetName.includes("Earth") && (
                                                                <>
                                                                    <circle cx="5" cy="5" r="3" fill="#228B22" opacity="0.6" />
                                                                    <circle cx="15" cy="15" r="4" fill="#228B22" opacity="0.5" />
                                                                </>
                                                            )}
                                                            {databasePlanet.oceanCoverage && parseInt(databasePlanet.oceanCoverage) > 70 && databasePlanet.planetName && !databasePlanet.planetName.includes("Earth") && (
                                                                <>
                                                                    <path d="M0,10 Q5,8 10,10 T20,10" stroke="rgba(255,255,255,0.3)" fill="none" strokeWidth="1" />
                                                                    <path d="M0,15 Q5,13 10,15 T20,15" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth="1" />
                                                                </>
                                                            )}
                                                            {databasePlanet.planetColor && (databasePlanet.planetColor.toLowerCase().includes("frost") || databasePlanet.planetColor.toLowerCase().includes("icy")) && (
                                                                <>
                                                                    <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                                                    <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                                                    <line x1="0" y1="15" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                                                </>
                                                            )}
                                                            {databasePlanet.planetColor && databasePlanet.planetColor.toLowerCase().includes("cloud") && <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)" />}
                                                            {databasePlanet.planetColor && databasePlanet.planetColor.toLowerCase().includes("streak") && <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2" />}
                                                            {databasePlanet.planetColor && databasePlanet.planetColor.toLowerCase().includes("ridge") && (
                                                                <>
                                                                    <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)" />
                                                                    <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)" />
                                                                </>
                                                            )}
                                                        </pattern>
                                                    </defs>
                                                    <circle cx="100" cy="100" r="70" fill={`url(#dbPlanetGradient-${databasePlanetIndex})`} stroke={getBaseColorFromDescription(databasePlanet.planetColor)} strokeWidth="2" opacity="0.9" />
                                                    <circle cx="100" cy="100" r="70" fill={`url(#dbPattern-${databasePlanetIndex})`} opacity="0.7" />
                                                    {databasePlanet.planetName && databasePlanet.planetName.includes("Erythos") && (
                                                        <>
                                                            <ellipse cx="70" cy="85" rx="12" ry="15" fill="rgba(139,0,0,0.4)" />
                                                            <ellipse cx="120" cy="105" rx="15" ry="10" fill="rgba(139,0,0,0.3)" />
                                                        </>
                                                    )}
                                                    {databasePlanet.planetName && databasePlanet.planetName.includes("Zenthara") && (
                                                        <>
                                                            <circle cx="80" cy="95" r="8" fill="rgba(60,20,10,0.5)" />
                                                            <circle cx="110" cy="110" r="6" fill="rgba(60,20,10,0.4)" />
                                                            <circle cx="95" cy="80" r="5" fill="rgba(60,20,10,0.3)" />
                                                        </>
                                                    )}
                                                    {databasePlanet.planetName && databasePlanet.planetName.includes("Kalmora") && (
                                                        <>
                                                            <ellipse cx="85" cy="90" rx="18" ry="22" fill="rgba(34,139,34,0.5)" />
                                                            <ellipse cx="115" cy="110" rx="15" ry="18" fill="rgba(34,139,34,0.4)" />
                                                        </>
                                                    )}
                                                    <circle cx="100" cy="100" r="75" fill="none" stroke={getBaseColorFromDescription(databasePlanet.planetColor)} strokeWidth="1" opacity="0.3" />
                                                </svg>
                                            </div>
                                        </div>
                                        {/* Navigation arrows at bottom */}
                                        <div className="database-navigation">
                                            <button className="database-nav-btn" onClick={() => handleDatabasePlanetChange("prev")} onMouseEnter={playHoverSound}>
                                                ◄
                                            </button>
                                            <button className="database-nav-btn" onClick={() => handleDatabasePlanetChange("next")} onMouseEnter={playHoverSound}>
                                                ►
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="database-layout">
                                        <div className="database-left-panel">
                                            <h3 className="database-planet-name">No planet data available</h3>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="middle-section">
                <div
                    className="database-container"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        });
                    }}
                    onMouseEnter={() => {
                        setShowTooltip(true);
                        playHoverSound();
                    }}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <img src="/Assets/Database.png" alt="Database" className="database-image" onClick={handleDatabaseClick} />
                    {showTooltip && (
                        <div
                            className="database-tooltip"
                            style={{
                                left: `${tooltipPosition.x}px`,
                                top: `${tooltipPosition.y - 40}px`,
                            }}
                        >
                            View Planetary Database
                        </div>
                    )}
                </div>
                <div className="window-container">
                    <img src="/Assets/Window.png" alt="Window" className="window-image" />

                    {/* Stars in window */}
                    <div className="space-effects"></div>

                    <div className={`planet-display ${isTransitioning ? "transitioning" : ""} ${isDeleting ? "deleting" : ""} ${introComplete && !isPlanetEntering ? "intro-complete" : ""} ${isPlanetEntering ? "planet-entering" : ""}`}>
                        <svg viewBox="0 0 200 200" className="planet-svg">
                            {/* Planet circle */}
                            <defs>
                                {currentVoice && (
                                    <>
                                        <radialGradient id={`planetGradient-${currentVoiceIndex}`}>
                                            <stop offset="0%" stopColor={getBaseColorFromDescription(currentVoice.planetColor)} stopOpacity="1" />
                                            <stop offset="70%" stopColor={getBaseColorFromDescription(currentVoice.planetColor)} stopOpacity="0.8" />
                                            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                                        </radialGradient>
                                        {/* Pattern for different planet types */}
                                        <pattern id={`pattern-${currentVoiceIndex}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                            {currentVoice.planetName && currentVoice.planetName.includes("Earth") && (
                                                <>
                                                    <circle cx="5" cy="5" r="3" fill="#228B22" opacity="0.6" />
                                                    <circle cx="15" cy="15" r="4" fill="#228B22" opacity="0.5" />
                                                </>
                                            )}
                                            {currentVoice.oceanCoverage && parseInt(currentVoice.oceanCoverage) > 70 && currentVoice.planetName && !currentVoice.planetName.includes("Earth") && (
                                                <>
                                                    <path d="M0,10 Q5,8 10,10 T20,10" stroke="rgba(255,255,255,0.3)" fill="none" strokeWidth="1" />
                                                    <path d="M0,15 Q5,13 10,15 T20,15" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth="1" />
                                                </>
                                            )}
                                            {currentVoice.planetColor && (currentVoice.planetColor.toLowerCase().includes("frost") || currentVoice.planetColor.toLowerCase().includes("icy")) && (
                                                <>
                                                    <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                                    <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                                    <line x1="0" y1="15" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                                </>
                                            )}
                                            {currentVoice.planetColor && currentVoice.planetColor.toLowerCase().includes("cloud") && (
                                                <>
                                                    <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)" />
                                                </>
                                            )}
                                            {currentVoice.planetColor && currentVoice.planetColor.toLowerCase().includes("streak") && (
                                                <>
                                                    <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2" />
                                                </>
                                            )}
                                            {currentVoice.planetColor && currentVoice.planetColor.toLowerCase().includes("ridge") && (
                                                <>
                                                    <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)" />
                                                    <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)" />
                                                </>
                                            )}
                                        </pattern>
                                    </>
                                )}
                            </defs>
                            {/* Apply pattern overlay */}
                            {currentVoice && (
                                <>
                                    <circle cx="100" cy="100" r="70" fill={`url(#planetGradient-${currentVoiceIndex})`} stroke={getBaseColorFromDescription(currentVoice.planetColor)} strokeWidth="2" opacity="0.9" />
                                    <circle cx="100" cy="100" r="70" fill={`url(#pattern-${currentVoiceIndex})`} opacity="0.7" />
                                    {/* Add some random surface features based on planet name */}
                                    {currentVoice.planetName && currentVoice.planetName.includes("Erythos") && (
                                        <>
                                            <ellipse cx="70" cy="85" rx="12" ry="15" fill="rgba(139,0,0,0.4)" />
                                            <ellipse cx="120" cy="105" rx="15" ry="10" fill="rgba(139,0,0,0.3)" />
                                        </>
                                    )}
                                    {currentVoice.planetName && currentVoice.planetName.includes("Zenthara") && (
                                        <>
                                            <circle cx="80" cy="95" r="8" fill="rgba(60,20,10,0.5)" />
                                            <circle cx="110" cy="110" r="6" fill="rgba(60,20,10,0.4)" />
                                            <circle cx="95" cy="80" r="5" fill="rgba(60,20,10,0.3)" />
                                        </>
                                    )}
                                    {currentVoice.planetName && currentVoice.planetName.includes("Kalmora") && (
                                        <>
                                            <ellipse cx="85" cy="90" rx="18" ry="22" fill="rgba(34,139,34,0.5)" />
                                            <ellipse cx="115" cy="110" rx="15" ry="18" fill="rgba(34,139,34,0.4)" />
                                        </>
                                    )}
                                    {/* Atmosphere glow */}
                                    <circle cx="100" cy="100" r="75" fill="none" stroke={getBaseColorFromDescription(currentVoice.planetColor)} strokeWidth="1" opacity="0.3" />
                                </>
                            )}
                        </svg>
                    </div>
                </div>
                <div className="other-screen-container">
                    <img src="/Assets/OtherScreen2.png" alt="Other Screen" className="other-screen-image" />
                    <div className={`screen-text ${isTransitioning ? "transitioning" : ""} ${isDeleting ? "deleting" : ""}`}>
                        <div className="screen-planet-wrapper">
                            <div className="screen-researcher-label">Researcher:</div>
                            <div 
                                className="screen-planet-name clickable-name" 
                                onClick={handleNameClick}
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setNameTooltipPosition({
                                        x: e.clientX - rect.left,
                                        y: e.clientY - rect.top,
                                    });
                                }}
                                onMouseEnter={() => {
                                    setShowNameTooltip(true);
                                    playHoverSound();
                                }}
                                onMouseLeave={() => setShowNameTooltip(false)}
                            >
                                {currentVoice && currentVoice.name}
                                {showNameTooltip && (
                                    <div
                                        className="name-tooltip"
                                        style={{
                                            left: `${nameTooltipPosition.x}px`,
                                            top: `${nameTooltipPosition.y - 40}px`,
                                        }}
                                    >
                                        View Chat History
                                    </div>
                                )}
                            </div>
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

                <img src="/Assets/SelectorBase.png" alt="Selector Base" className="selector-base-image" />

                <div
                    className="arrow-container arrow-left-container"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setArrowTooltipPosition({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        });
                    }}
                    onMouseEnter={() => {
                        setShowArrowTooltip("prev");
                        playHoverSound();
                    }}
                    onMouseLeave={() => setShowArrowTooltip(null)}
                >
                    <img src="/Assets/SelectorLeftArrow.png" alt="Selector Left Arrow" className="selector-left-arrow" onClick={() => handleVoiceChange("prev")} />
                    {showArrowTooltip === "prev" && (
                        <div
                            className="arrow-tooltip"
                            style={{
                                left: `${arrowTooltipPosition.x}px`,
                                top: `${arrowTooltipPosition.y - 40}px`,
                            }}
                        >
                            Previous Planet
                        </div>
                    )}
                </div>

                <div className="selector-center-buttons">
                    <div
                        className="button-tooltip-container"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setButtonTooltipPosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                            });
                        }}
                        onMouseEnter={() => {
                            setShowButtonTooltip("eject");
                            playHoverSound();
                        }}
                        onMouseLeave={() => setShowButtonTooltip(null)}
                    >
                        <button className="selector-action-btn remove-btn" onClick={handleRemoveCurrentPlanet} title="Remove planet from call list" disabled={removedPlanets.includes(currentVoiceIndex) || isTransmitterClose}>
                            ✕
                        </button>
                        {showButtonTooltip === "eject" && (
                            <div
                                className="button-tooltip eject-tooltip"
                                style={{
                                    left: `${buttonTooltipPosition.x}px`,
                                    top: `${buttonTooltipPosition.y - 40}px`,
                                }}
                            >
                                Eject Planet
                            </div>
                        )}
                    </div>

                    <div
                        className="button-tooltip-container"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setButtonTooltipPosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                            });
                        }}
                        onMouseEnter={() => {
                            setShowButtonTooltip("choose");
                            playHoverSound();
                        }}
                        onMouseLeave={() => setShowButtonTooltip(null)}
                    >
                        <button className="selector-action-btn select-btn" onClick={handleSelectPlanet} title="Select this planet to land" disabled={isTransmitterClose}>
                            ✓
                        </button>
                        {showButtonTooltip === "choose" && (
                            <div
                                className="button-tooltip choose-tooltip"
                                style={{
                                    left: `${buttonTooltipPosition.x}px`,
                                    top: `${buttonTooltipPosition.y - 40}px`,
                                }}
                            >
                                Choose Planet
                            </div>
                        )}
                    </div>

                    {isDatabaseOpen && (
                        <button 
                            className="selector-action-btn goto-btn" 
                            onClick={handleGoToDatabasePlanet} 
                            title="Go to selected database planet"
                            onMouseEnter={playHoverSound}
                        >
                            →
                        </button>
                    )}
                </div>

                <div
                    className="arrow-container arrow-right-container"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setArrowTooltipPosition({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        });
                    }}
                    onMouseEnter={() => {
                        setShowArrowTooltip("next");
                        playHoverSound();
                    }}
                    onMouseLeave={() => setShowArrowTooltip(null)}
                >
                    <img src="/Assets/SelectorRightArrow.png" alt="Selector Right Arrow" className="selector-right-arrow" onClick={() => handleVoiceChange("next")} />
                    {showArrowTooltip === "next" && (
                        <div
                            className="arrow-tooltip"
                            style={{
                                left: `${arrowTooltipPosition.x}px`,
                                top: `${arrowTooltipPosition.y - 40}px`,
                            }}
                        >
                            Next Planet
                        </div>
                    )}
                </div>

                <img src="/Assets/Radio.png" alt="Radio" className="radio-image" />
                <div className="transmitter-container">
                    <img
                        src="/Assets/TransmitterFar.png"
                        alt="Transmitter"
                        className={`transmitter-image ${isTransmitterClose ? "hidden" : ""}`}
                        onClick={() => {
                            const audio = new Audio("/Audio/RadioOn.mp3");
                            audio.play();
                            setIsTransmitterClose(true);
                        }}
                        onMouseEnter={playHoverSound}
                    />
                    <img
                        src="/Assets/TransmitterClose.png"
                        alt="Transmitter Close"
                        className={`transmitter-close ${isTransmitterClose ? "visible" : ""} ${isRecording && isTransmitterClose ? "recording" : ""}`}
                        onClick={() => {
                            const audio = new Audio("/Audio/RadioOff.mp3");
                            audio.play();
                            setIsTransmitterClose(false);
                        }}
                        onMouseEnter={playHoverSound}
                    />
                    {isTransmitterClose && (
                        <div className="space-bar-indicator">
                            <div className="space-bar-icon">SPACE</div>
                            <div className="space-bar-text">Hold to Talk</div>
                        </div>
                    )}
                </div>
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

            {/* Win/Lose Modal */}
            {gameOver && (
                <div className="game-over-modal-overlay">
                    <div className="game-over-modal">
                        {gameOver === "win" ? (
                            <>
                                <h1 className="game-over-title win-title">🎉 SUCCESS! 🎉</h1>
                                <p className="game-over-message">
                                    {currentVoice && currentVoice.planetName && `You found the real researcher at ${currentVoice.planetName}!`}
                                    <br />
                                    Your ship has landed safely.
                                </p>
                            </>
                        ) : gameOver === "oxygen" ? (
                            <>
                                <h1 className="game-over-title oxygen-title">💀 OXYGEN DEPLETED 💀</h1>
                                <p className="game-over-message">
                                    You ran out of oxygen!
                                    <br />
                                    Your crew has suffocated in the darkness of space.
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="game-over-title lose-title">💥 MISSION FAILED 💥</h1>
                                <p className="game-over-message">
                                    {currentVoice && currentVoice.planetName && `${currentVoice.planetName} was an impostor!`}
                                    <br />
                                    Your ship crashed on landing.
                                </p>
                            </>
                        )}
                        <button className="restart-button" onClick={handleRestart} onMouseEnter={playHoverSound}>
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Log Modal */}
            {isChatLogOpen && (
                <div className="database-modal-overlay" onClick={handleCloseChatLog}>
                    <div className="database-modal chat-log-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={handleCloseChatLog} onMouseEnter={playHoverSound}>
                            ✕
                        </button>
                        <div className="database-modal-content">
                            <h2>Conversation History - {currentVoice?.name}</h2>
                            <div className="chat-log-container">
                                {allChatLogs.length === 0 ? (
                                    <p className="no-logs">No conversation history with {currentVoice?.name} yet.</p>
                                ) : (
                                    allChatLogs.map((log, index) => (
                                        <div key={`${log.gameId}-${index}`} className="chat-log-entry">
                                            <div className="chat-log-header">
                                                <span className="log-researcher">{log.researcherName}</span>
                                                <span className="log-planet">({log.planetName})</span>
                                                {index === 0 && log.gameId === currentGameSession?.gameId && <span className="log-outcome current">⚡ Current</span>}
                                                {log.outcome && <span className={`log-outcome ${log.outcome}`}>{log.outcome === "win" ? "✓ Real" : "✗ Impostor"}</span>}
                                            </div>
                                            <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                                            <div className="log-messages">
                                                {log.messages.map((msg, msgIndex) => (
                                                    <div key={msgIndex} className={`log-message ${msg.role}`}>
                                                        <span className="message-role">{msg.role === "user" ? "You" : log.researcherName}:</span>
                                                        <span className="message-content">{msg.content}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );


    // Show loading while checking if user is new
    if (showIntro === null) {
        return (
            <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ color: '#00ff00', fontFamily: 'Courier New', fontSize: '1.5rem', textShadow: '0 0 10px rgba(0, 255, 0, 0.8)' }}>
                    Loading...
                </div>
            </div>
        );
    }

    // Show game session detail view
    if (selectedGameId) {
        return (
            <GameSessionDetail
                gameId={selectedGameId}
                onBack={handleBackToDashboard}
                onStartNewGame={handleStartNewGame}
            />
        );
    }

    // Show dashboard for returning users
    if (showDashboard) {
        return (
            <DashboardScreen
                onStartNewGame={handleStartNewGame}
                onViewSession={handleViewGameDetails}
            />
        );
    }

    // Show intro scene first with game scene in background (only for new users)
    if (showIntro) {
        return <IntroScene onComplete={handleIntroComplete} gameSceneContent={gameSceneContent} />;
    }

    return gameSceneContent;
}

export default App;

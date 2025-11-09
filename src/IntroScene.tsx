import { useState, useEffect, useRef } from "react";
import "./IntroScene.css";
import { textToSpeech } from "./services/elevenlabs";
import { VOICES } from "./data/voices";

interface IntroSceneProps {
    onComplete: () => void;
    gameSceneContent: React.ReactNode;
}

export function IntroScene({ onComplete, gameSceneContent }: IntroSceneProps) {
    const [stage, setStage] = useState<"blackout" | "fade" | "crash" | "panel" | "database">("blackout");
    const [shake, setShake] = useState(false);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [startGlow, setStartGlow] = useState(false);
    const [revealedText, setRevealedText] = useState("");
    const [isNarrating, setIsNarrating] = useState(false);
    const [narrationFinished, setNarrationFinished] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const revealIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        // Start with complete blackness
        const blackoutTimer = setTimeout(() => {
            setStage("fade");
        }, 1000);

        // First fade in - show the background
        const fadeInTimer = setTimeout(() => {
            setShowBlackOverlay(false);
        }, 1500);

        // Fade back out
        const fadeOutTimer = setTimeout(() => {
            setShowBlackOverlay(true);
        }, 3500);

        // Fade in again
        const fadeInAgainTimer = setTimeout(() => {
            setShowBlackOverlay(false);
        }, 5000);

        // Fade back to black before crash
        const fadeBeforeCrashTimer = setTimeout(() => {
            setShowBlackOverlay(true);
        }, 7000);

        // Crash happens while screen is black
        const crashTimer = setTimeout(() => {
            setStage("crash");
            setShake(true);
            // Play crash sound here if you have one
        }, 7500);

        // Stop shaking and start glow
        const stopShakeTimer = setTimeout(() => {
            setShake(false);
            setStage("panel");
            setShowBlackOverlay(false); // Reveal the panel
            
            // Start glow animation after shake completes
            setStartGlow(true);
        }, 8500);

        return () => {
            clearTimeout(blackoutTimer);
            clearTimeout(fadeInTimer);
            clearTimeout(fadeOutTimer);
            clearTimeout(fadeInAgainTimer);
            clearTimeout(fadeBeforeCrashTimer);
            clearTimeout(crashTimer);
            clearTimeout(stopShakeTimer);
        };
    }, []);

    const handleBlueCircleClick = () => {
        setStage("database");
        setShowBlackOverlay(true); // Fade to black before showing database
        setTimeout(() => {
            setShowBlackOverlay(false);
        }, 500);
    };

    // The exact system message to display and narrate
    const systemMessage = `System Alert: Hull intergrity compromised
Structrual damage detected, initiating emergency diagnostics.

Mission: Emergency Landing, Repair Required
Your hull and life support are damaged. Oxygen reserves are limited. Five nearby planets are reachable, only one contains the authorized engineer who can repair your ship. The others will sabotage your ship if you land. Interview one representative from each planet, verify their claims against your planetary database, and choose the correct planet to land on.`;

    useEffect(() => {
        // When entering the database stage start narration and text reveal
        if (stage === "database") {
            let cancelled = false;

            async function startNarration() {
                try {
                    setIsNarrating(true);
                    setNarrationFinished(false);
                    setRevealedText("");

                    // Choose a suitable voice (prefer authoritative / researcher-like voice)
                    const shipVoice = VOICES.find((v) => v.isResearcher) || VOICES[0];
                    const voiceId = shipVoice?.id || VOICES[0].id;

                    // Request TTS and get audio URL
                    const audioUrl = await textToSpeech(systemMessage, voiceId);
                    if (cancelled) return;

                    // Create audio element
                    const audio = new Audio(audioUrl);
                    audioRef.current = audio;

                    // When metadata is loaded we can compute reveal timing
                    audio.onloadedmetadata = () => {
                        const duration = audio.duration || 3; // seconds
                        const totalChars = systemMessage.length || 1;
                        const intervalMs = Math.max(10, (duration * 1000) / totalChars);

                        // Start revealing characters in sync with audio duration
                        let idx = 0;
                        if (revealIntervalRef.current) {
                            window.clearInterval(revealIntervalRef.current);
                        }
                        revealIntervalRef.current = window.setInterval(() => {
                            idx++;
                            setRevealedText(systemMessage.slice(0, idx));
                            if (idx >= totalChars) {
                                if (revealIntervalRef.current) {
                                    window.clearInterval(revealIntervalRef.current);
                                    revealIntervalRef.current = null;
                                }
                            }
                        }, intervalMs);
                    };

                    audio.onended = () => {
                        // Ensure full text is revealed
                        setRevealedText(systemMessage);
                        setIsNarrating(false);
                        setNarrationFinished(true);
                        // Revoke object URL to free memory
                        try {
                            URL.revokeObjectURL(audio.src);
                        } catch (e) {}
                    };

                    // Play the audio
                    try {
                        await audio.play();
                    } catch (err) {
                        console.error("Audio play failed:", err);
                        // If playback fails, reveal text immediately
                        setRevealedText(systemMessage);
                        setIsNarrating(false);
                        setNarrationFinished(true);
                    }
                } catch (error) {
                    console.error("Failed to start narration:", error);
                    setRevealedText(systemMessage);
                    setIsNarrating(false);
                    setNarrationFinished(true);
                }
            }

            startNarration();

            return () => {
                cancelled = true;
                // cleanup audio + intervals
                if (audioRef.current) {
                    try {
                        audioRef.current.pause();
                        URL.revokeObjectURL(audioRef.current.src);
                    } catch (e) {}
                    audioRef.current = null;
                }
                if (revealIntervalRef.current) {
                    window.clearInterval(revealIntervalRef.current);
                    revealIntervalRef.current = null;
                }
            };
        }
    }, [stage]);

    const handleSkipNarration = () => {
        // Stop audio and reveal full text immediately
        if (audioRef.current) {
            try {
                audioRef.current.pause();
                URL.revokeObjectURL(audioRef.current.src);
            } catch (e) {}
            audioRef.current = null;
        }
        if (revealIntervalRef.current) {
            window.clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }
        setRevealedText(systemMessage);
        setIsNarrating(false);
        setNarrationFinished(true);
    };

    const handleDatabaseContinue = () => {
        onComplete();
    };

    return (
        <div className={`intro-scene ${shake ? "shake" : ""}`}>
            {/* Game scene in background - non-interactable, shows Base2 during intro */}
            <div className={`intro-game-scene-background ${(stage === "blackout" || stage === "fade" || stage === "crash" || stage === "panel") ? "use-base2" : ""}`}>
                {gameSceneContent}
                
                {/* Control panel overlay - part of the game scene layer */}
                {(stage === "fade" || stage === "crash" || stage === "panel") && (
                    <div 
                        className={`control-panel-in-scene ${startGlow ? 'glow-active' : ''}`}
                        onClick={stage === "panel" ? handleBlueCircleClick : undefined}
                        style={{ pointerEvents: stage === "panel" ? 'auto' : 'none' }}
                    >
                        <img src="/Assets/controlPanel.png" alt="Control Panel" className="control-panel-scene-image" />
                    </div>
                )}
            </div>

            {/* Black overlay for fades */}
            <div className={`black-overlay ${showBlackOverlay ? "visible" : "hidden"}`}></div>

            {stage === "crash" && (
                <div className="crash-overlay">
                    <div className="crash-text">SYSTEM CRITICAL FAILURE</div>
                </div>
            )}

            {stage === "database" && (
                <div className="database-fullscreen">
                    <div className="database-header">EMERGENCY CONTACT DATABASE</div>
                    <div className="database-content">
                        <div className="emergency-text" style={{ whiteSpace: 'pre-wrap' }}>
                            {revealedText || ""}
                        </div>
                    </div>
                    <div className="database-footer">
                        {isNarrating && (
                            <button className="database-skip-btn" onClick={handleSkipNarration}>
                                SKIP
                            </button>
                        )}

                        <button
                            className="database-continue-btn"
                            onClick={handleDatabaseContinue}
                            disabled={!narrationFinished}
                            title={!narrationFinished ? 'Wait for narration or skip' : 'Begin mission'}
                        >
                            BEGIN MISSION
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

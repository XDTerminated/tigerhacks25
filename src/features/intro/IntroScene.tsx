import { useState, useEffect, useRef } from "react";
import "./IntroScene.css";
import { textToSpeech } from "../../services/elevenlabs";
import { VOICES } from "../../data/voices";

interface IntroSceneProps {
    onComplete: () => void;
    gameSceneContent: React.ReactNode;
}

export function IntroScene({ onComplete, gameSceneContent }: IntroSceneProps) {
    const [stage, setStage] = useState<"blackout" | "fade" | "crash" | "panel" | "database" | "transitioning">("blackout");
    const [shake, setShake] = useState(false);
    const [showBlackOverlay, setShowBlackOverlay] = useState(true);
    const [startGlow, setStartGlow] = useState(false);
    const [revealedText, setRevealedText] = useState("");
    const [isNarrating, setIsNarrating] = useState(false);
    const [narrationFinished, setNarrationFinished] = useState(false);
    const [showRedFlash, setShowRedFlash] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const revealIntervalRef = useRef<number | null>(null);
    const redFlashIntervalRef = useRef<number | null>(null);
    const oxygenErrorAudioRef = useRef<HTMLAudioElement | null>(null);

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

        // Play crash sound effect 0.5 seconds before shake
        const crashSoundTimer = setTimeout(() => {
            const crashAudio = new Audio("/Audio/car-crash-sound-effect-376874.mp3");
            crashAudio.volume = 0.7;
            crashAudio.play().catch(() => {});
        }, 7000);

        // Crash happens while screen is black
        const crashTimer = setTimeout(() => {
            setStage("crash");
            setShake(true);
        }, 7500);

        // Stop shaking and start glow
        const stopShakeTimer = setTimeout(() => {
            setShake(false);
            setStage("panel");
            setShowBlackOverlay(false); // Reveal the panel

            // Start glow animation after shake completes
            setStartGlow(true);

            // Start periodic red flash and oxygen error sound
            const flashInterval = window.setInterval(() => {
                setShowRedFlash(true);

                // Play oxygen error sound
                const oxygenAudio = new Audio("/Audio/OxygenError.mp3");
                oxygenAudio.volume = 0.5;
                oxygenErrorAudioRef.current = oxygenAudio;
                oxygenAudio.play().catch(() => {});

                // Turn off red flash after 0.5 seconds
                setTimeout(() => setShowRedFlash(false), 500);
            }, 2000); // Flash every 2 seconds

            redFlashIntervalRef.current = flashInterval;
        }, 8500);

        return () => {
            clearTimeout(blackoutTimer);
            clearTimeout(fadeInTimer);
            clearTimeout(fadeOutTimer);
            clearTimeout(fadeInAgainTimer);
            clearTimeout(fadeBeforeCrashTimer);
            clearTimeout(crashSoundTimer);
            clearTimeout(crashTimer);
            clearTimeout(stopShakeTimer);
            if (redFlashIntervalRef.current) {
                clearInterval(redFlashIntervalRef.current);
            }
            if (oxygenErrorAudioRef.current) {
                oxygenErrorAudioRef.current.pause();
            }
        };
    }, []);

    const handleBlueCircleClick = () => {
        // Stop the red flash and oxygen error sound
        if (redFlashIntervalRef.current) {
            clearInterval(redFlashIntervalRef.current);
            redFlashIntervalRef.current = null;
        }
        if (oxygenErrorAudioRef.current) {
            oxygenErrorAudioRef.current.pause();
            oxygenErrorAudioRef.current = null;
        }
        setShowRedFlash(false);

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

            // Preferred ElevenLabs voice id (ship-AI) - overridden by user input
            const PREFERRED_SHIP_VOICE_ID = "weA4Q36twV5kwSaTEL0Q";

            async function startNarration() {
                try {
                    setIsNarrating(true);
                    setNarrationFinished(false);
                    setRevealedText("");

                    // Choose a suitable voice (prefer user-specified ship-AI voice if available)
                    const shipVoice = VOICES.find((v) => v.isResearcher) || VOICES[0];
                    const voiceId = PREFERRED_SHIP_VOICE_ID || shipVoice?.id || VOICES[0].id;

                    // Request TTS and get audio URL
                    const audioUrl = await textToSpeech(systemMessage, voiceId);
                    if (cancelled) return;

                    // Create audio element
                    const audio = new Audio(audioUrl);
                    // Playback rate to make the ship-AI speak faster
                    const PREFERRED_PLAYBACK_RATE = 1.25; // 1.0 = normal, >1 faster
                    try {
                        audio.playbackRate = PREFERRED_PLAYBACK_RATE;
                    } catch {
                        // Silently handle playbackRate errors
                    }
                    audioRef.current = audio;

                    // When metadata is loaded we can compute reveal timing
                    audio.onloadedmetadata = () => {
                        const duration = audio.duration || 3; // seconds
                        const totalChars = systemMessage.length || 1;
                        // Account for playback rate when calculating reveal speed
                        const adjustedDuration = duration / PREFERRED_PLAYBACK_RATE;
                        const intervalMs = Math.max(15, (adjustedDuration * 1000) / totalChars);

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
                        } catch {
                            // Ignore URL revocation errors
                        }
                    };

                    // Play the audio
                    try {
                        await audio.play();
                    } catch {
                        // If playback fails, reveal text immediately
                        setRevealedText(systemMessage);
                        setIsNarrating(false);
                        setNarrationFinished(true);
                    }
                } catch {
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
                    } catch {
                        // Ignore cleanup errors
                    }
                    audioRef.current = null;
                }
                if (revealIntervalRef.current) {
                    window.clearInterval(revealIntervalRef.current);
                    revealIntervalRef.current = null;
                }
            };
        }
    }, [stage, systemMessage]);

    const handleSkipNarration = () => {
        // Stop audio and reveal full text immediately
        if (audioRef.current) {
            try {
                audioRef.current.pause();
                URL.revokeObjectURL(audioRef.current.src);
            } catch {
                // Ignore cleanup errors
            }
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
        setStage("transitioning");
        setShowBlackOverlay(true);
        setTimeout(() => {
            onComplete();
        }, 1800); // 1.8s fade duration
    };

    return (
        <div className={`intro-scene ${shake ? "shake" : ""}`}>
            {/* Game scene in background - non-interactable, shows Base2 during intro */}
            <div className={`intro-game-scene-background ${stage === "blackout" || stage === "fade" || stage === "crash" || stage === "panel" ? "use-base2" : ""}`}>
                {gameSceneContent}

                {/* Control panel overlay - part of the game scene layer */}
                {(stage === "fade" || stage === "crash" || stage === "panel") && (
                    <div className={`control-panel-in-scene ${startGlow ? "glow-active" : ""}`} onClick={stage === "panel" ? handleBlueCircleClick : undefined} style={{ pointerEvents: stage === "panel" ? "auto" : "none" }}>
                        <img src="/Assets/controlPanel.png" alt="Control Panel" className="control-panel-scene-image" />
                    </div>
                )}
            </div>

            {/* Black overlay for fades and transition */}
            <div className={`black-overlay${stage === "transitioning" ? " fade-out" : showBlackOverlay ? " visible" : " hidden"}`}></div>

            {/* Red flash overlay for panel stage */}
            {showRedFlash && stage === "panel" && (
                <div className="crash-overlay">
                    <div className="crash-text">OXYGEN SYSTEM FAILURE</div>
                </div>
            )}

            {stage === "crash" && (
                <div className="crash-overlay">
                    <div className="crash-text">SYSTEM CRITICAL FAILURE</div>
                </div>
            )}

            {stage === "database" && (
                <div
                    className="database-modal-overlay"
                    onClick={() => {
                        /* click outside does nothing during intro */
                    }}
                >
                    <div className="database-modal" onClick={(e) => e.stopPropagation()}>
                        {/* No close button here — user must read/skip then begin mission */}
                        <div className="database-modal-content">
                            <h2>EMERGENCY CONTACT DATABASE</h2>

                            <div className="emergency-text" style={{ whiteSpace: "pre-wrap" }}>
                                {revealedText || ""}
                            </div>

                            {narrationFinished && (
                                <div className="database-footer">
                                    <button className="database-continue-btn" onClick={handleDatabaseContinue} title="Begin mission">
                                        BEGIN MISSION
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isNarrating && (
                        <button className="database-skip-btn-screen" onClick={handleSkipNarration}>
                            SKIP
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

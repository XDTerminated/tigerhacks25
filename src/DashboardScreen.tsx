import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getGameSessions, type GameSession } from "./services/api";
import { getBaseColorFromDescription } from "./utils/planetGenerator";
import "./DashboardScreen.css";

interface DashboardScreenProps {
    onStartNewGame: () => void;
    onViewSession: (gameId: string) => void;
}

export default function DashboardScreen({ onStartNewGame, onViewSession }: DashboardScreenProps) {
    const { user, logout } = useAuth0();
    const [sessions, setSessions] = useState<GameSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadSessions() {
            if (!user?.email) return;

            try {
                setIsLoading(true);
                setError(null);
                const gameSessions = await getGameSessions(user.email);
                // Sort by start_time descending (newest first)
                const sorted = gameSessions.sort((a, b) =>
                    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                );

                // Log planet data for debugging
                console.log("📊 Dashboard loaded sessions:", sorted);
                sorted.forEach(session => {
                    if (session.outcome === 'win') {
                        console.log(`🎉 Win session ${session.game_id}:`, {
                            planet: session.selected_planet,
                            color: session.planet_color,
                            temp: session.planet_temperature,
                            ocean: session.planet_ocean,
                            gravity: session.planet_gravity
                        });
                    }
                });

                setSessions(sorted);
            } catch (err) {
                console.error("Failed to load game sessions:", err);
                setError("Failed to load mission history");
            } finally {
                setIsLoading(false);
            }
        }

        loadSessions();
    }, [user?.email]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const getOutcomeBadge = (outcome?: string) => {
        if (!outcome) return <span className="outcome-badge pending">INCOMPLETE</span>;

        switch (outcome.toLowerCase()) {
            case 'win':
                return <span className="outcome-badge win">✓ WIN</span>;
            case 'lose':
                return <span className="outcome-badge lose">✗ LOSE</span>;
            case 'oxygen':
                return <span className="outcome-badge oxygen">⚠ OXYGEN FAILURE</span>;
            default:
                return <span className="outcome-badge">{outcome.toUpperCase()}</span>;
        }
    };

    const renderPlanetVisualization = (session: GameSession) => {
        // Only render for winning sessions
        if (session.outcome !== 'win') {
            console.log(`⚠️ Session ${session.game_id} is not a win, skipping visualization`);
            return null;
        }

        // Try to get planet data from backend first, then fallback to localStorage
        let planetColor = session.planet_color;
        let planetTemperature = session.planet_temperature;
        let planetOcean = session.planet_ocean;
        let planetGravity = session.planet_gravity;

        if (!planetColor) {
            // Try to load from localStorage as fallback
            try {
                const planetDataKey = `planet_data_${session.game_id}`;
                const storedData = localStorage.getItem(planetDataKey);
                if (storedData) {
                    const planetData = JSON.parse(storedData);
                    planetColor = planetData.planetColor;
                    planetTemperature = planetData.avgTemp;
                    planetOcean = planetData.oceanCoverage;
                    planetGravity = planetData.gravity;
                    console.log(`📦 Loaded planet data from localStorage for ${session.game_id}:`, planetData);
                }
            } catch (error) {
                console.error("Failed to load planet data from localStorage:", error);
            }
        }

        if (!planetColor) {
            console.log(`⚠️ Session ${session.game_id} is missing planet_color even after localStorage check:`, {
                planet_color: session.planet_color,
                planet_temperature: session.planet_temperature,
                planet_ocean: session.planet_ocean,
                planet_gravity: session.planet_gravity
            });
            return null;
        }

        console.log(`✅ Rendering planet visualization for session ${session.game_id}`);

        const oceanCoverage = planetOcean ? parseInt(planetOcean) : 0;
        const planetName = session.selected_planet || '';
        const baseColor = getBaseColorFromDescription(planetColor);

        return (
            <div className="planet-visualization-container">
                <svg viewBox="0 0 120 120" className="planet-svg-dashboard">
                    <defs>
                        <radialGradient id={`planetGradient-${session.game_id}`}>
                            <stop offset="0%" stopColor={baseColor} stopOpacity="1" />
                            <stop offset="70%" stopColor={baseColor} stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                        </radialGradient>
                        <pattern id={`pattern-${session.game_id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                            {planetName.includes("Earth") && (
                                <>
                                    <circle cx="5" cy="5" r="3" fill="#228B22" opacity="0.6" />
                                    <circle cx="15" cy="15" r="4" fill="#228B22" opacity="0.5" />
                                </>
                            )}
                            {oceanCoverage > 70 && !planetName.includes("Earth") && (
                                <>
                                    <path d="M0,10 Q5,8 10,10 T20,10" stroke="rgba(255,255,255,0.3)" fill="none" strokeWidth="1" />
                                    <path d="M0,15 Q5,13 10,15 T20,15" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth="1" />
                                </>
                            )}
                            {(planetColor.toLowerCase().includes("frost") || planetColor.toLowerCase().includes("icy")) && (
                                <>
                                    <line x1="0" y1="5" x2="20" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                    <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                    <line x1="0" y1="15" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                                </>
                            )}
                            {planetColor.toLowerCase().includes("cloud") && (
                                <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)" />
                            )}
                            {planetColor.toLowerCase().includes("streak") && (
                                <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2" />
                            )}
                            {planetColor.toLowerCase().includes("ridge") && (
                                <>
                                    <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)" />
                                    <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)" />
                                </>
                            )}
                        </pattern>
                    </defs>
                    <circle cx="60" cy="60" r="45" fill={`url(#planetGradient-${session.game_id})`} stroke={baseColor} strokeWidth="1.5" opacity="0.9" />
                    <circle cx="60" cy="60" r="45" fill={`url(#pattern-${session.game_id})`} opacity="0.7" />
                    {planetName.includes("Erythos") && (
                        <>
                            <ellipse cx="45" cy="55" rx="8" ry="10" fill="rgba(139,0,0,0.4)" />
                            <ellipse cx="70" cy="65" rx="10" ry="7" fill="rgba(139,0,0,0.3)" />
                        </>
                    )}
                    {planetName.includes("Zenthara") && (
                        <>
                            <circle cx="50" cy="58" r="5" fill="rgba(60,20,10,0.5)" />
                            <circle cx="68" cy="65" r="4" fill="rgba(60,20,10,0.4)" />
                            <circle cx="58" cy="50" r="3" fill="rgba(60,20,10,0.3)" />
                        </>
                    )}
                    {planetName.includes("Kalmora") && (
                        <>
                            <ellipse cx="52" cy="56" rx="12" ry="14" fill="rgba(34,139,34,0.5)" />
                            <ellipse cx="68" cy="65" rx="10" ry="12" fill="rgba(34,139,34,0.4)" />
                        </>
                    )}
                    <circle cx="60" cy="60" r="48" fill="none" stroke={baseColor} strokeWidth="0.5" opacity="0.3" />
                </svg>
                <div className="planet-info-dashboard">
                    <div className="planet-name-dashboard">{planetName}</div>
                    <div className="planet-stats-dashboard">
                        {planetTemperature && <span>🌡️ {planetTemperature}</span>}
                        {planetOcean && <span>🌊 {planetOcean}</span>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            <button
                className="logout-button-dashboard"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                title="Logout"
            >
                Logout
            </button>

            <div className="dashboard-content">
                <h1 className="dashboard-title">MISSION HISTORY DATABASE</h1>
                <p className="dashboard-subtitle">Past Planetary Research Missions</p>

                {isLoading && (
                    <div className="dashboard-loading">
                        <div className="loading-text">Loading mission records...</div>
                    </div>
                )}

                {error && (
                    <div className="dashboard-error">
                        <div className="error-text">{error}</div>
                    </div>
                )}

                {!isLoading && !error && sessions.length === 0 && (
                    <div className="dashboard-empty">
                        <div className="empty-text">No missions on record</div>
                        <p className="empty-subtext">Begin your first planetary research mission</p>
                    </div>
                )}

                {!isLoading && !error && sessions.length > 0 && (
                    <div className="sessions-list">
                        {sessions.map((session) => (
                            <div key={session.game_id} className={`session-card ${session.outcome === 'win' ? 'session-card-win' : ''}`}>
                                <div className="session-header">
                                    <div className="session-date">{formatDate(session.start_time)}</div>
                                    {getOutcomeBadge(session.outcome)}
                                </div>
                                <div className="session-content-wrapper">
                                    <div className="session-details">
                                        <div className="session-row">
                                            <span className="session-label">Researcher:</span>
                                            <span className="session-value">{session.selected_researcher || 'Unknown'}</span>
                                        </div>
                                        <div className="session-row">
                                            <span className="session-label">Planet:</span>
                                            <span className="session-value">{session.selected_planet || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    {renderPlanetVisualization(session)}
                                </div>
                                <button
                                    className="view-details-btn"
                                    onClick={() => onViewSession(session.game_id)}
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button className="start-mission-btn" onClick={onStartNewGame}>
                    START NEW MISSION
                </button>
            </div>
        </div>
    );
}

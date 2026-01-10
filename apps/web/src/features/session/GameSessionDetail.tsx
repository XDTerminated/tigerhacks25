import { useState, useEffect } from "react";
import { getGameSessionWithChats, type GameSessionWithChats } from "../../services/api";
import "./GameSessionDetail.css";

interface GameSessionDetailProps {
    gameId: string;
    onBack: () => void;
    onStartNewGame?: () => void;
}

export default function GameSessionDetail({ gameId, onBack }: GameSessionDetailProps) {
    const [sessionData, setSessionData] = useState<GameSessionWithChats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedResearcher, setExpandedResearcher] = useState<string | null>(null);

    useEffect(() => {
        async function loadSessionDetails() {
            try {
                setIsLoading(true);
                setError(null);
                const data = await getGameSessionWithChats(gameId);
                setSessionData(data);
                // Auto-expand the first researcher by default
                if (data.chat_logs.length > 0) {
                    setExpandedResearcher(data.chat_logs[0].researcher_name);
                }
            } catch (err) {
                console.error("Failed to load session details:", err);
                setError("Failed to load mission details");
            } finally {
                setIsLoading(false);
            }
        }

        loadSessionDetails();
    }, [gameId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    const getOutcomeClass = (outcome?: string) => {
        if (!outcome) return "pending";
        switch (outcome.toLowerCase()) {
            case "win":
                return "win";
            case "lose":
                return "lose";
            case "oxygen":
                return "oxygen";
            default:
                return "";
        }
    };

    const getOutcomeText = (outcome?: string) => {
        if (!outcome) return "IN PROGRESS";
        switch (outcome.toLowerCase()) {
            case "win":
                return "MISSION SUCCESS";
            case "lose":
                return "MISSION FAILED";
            case "oxygen":
                return "OXYGEN FAILURE";
            default:
                return outcome.toUpperCase();
        }
    };

    const toggleResearcher = (researcherName: string) => {
        setExpandedResearcher(expandedResearcher === researcherName ? null : researcherName);
    };

    if (isLoading) {
        return (
            <div className="session-detail-container">
                <div className="session-detail-loading">
                    <div className="loading-text">Loading mission debrief...</div>
                </div>
            </div>
        );
    }

    if (error || !sessionData) {
        return (
            <div className="session-detail-container">
                <button className="back-btn" onClick={onBack}>
                    ← Back to Dashboard
                </button>
                <div className="session-detail-error">
                    <div className="error-text">{error || "Mission data not found"}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="session-detail-container">
            <button className="back-btn" onClick={onBack}>
                ← Back to Dashboard
            </button>

            <div className="session-detail-content">
                <h1 className={`session-detail-title ${getOutcomeClass(sessionData.outcome)}`}>{getOutcomeText(sessionData.outcome)}</h1>
                <p className="session-detail-date">{formatDate(sessionData.start_time)}</p>

                {sessionData.selected_researcher && sessionData.selected_planet && (
                    <div className="selected-info">
                        <span className="selected-label">Selected:</span>
                        <span className="selected-value">
                            {sessionData.selected_researcher} ({sessionData.selected_planet})
                        </span>
                    </div>
                )}

                <h2 className="chat-logs-title">Mission Communications Log</h2>

                {sessionData.chat_logs.length === 0 && (
                    <div className="no-chats">
                        <p>No communication records found for this mission</p>
                    </div>
                )}

                <div className="researcher-logs">
                    {sessionData.chat_logs.map((chatLog) => {
                        const isExpanded = expandedResearcher === chatLog.researcher_name;
                        const isSelected = chatLog.researcher_name === sessionData.selected_researcher;

                        return (
                            <div key={chatLog.researcher_name} className="researcher-section">
                                <button className={`researcher-header ${isSelected ? "selected" : ""}`} onClick={() => toggleResearcher(chatLog.researcher_name)}>
                                    <span className="researcher-name">
                                        {chatLog.researcher_name} ({chatLog.planet_name}){isSelected && <span className="selected-badge">✓ Selected</span>}
                                    </span>
                                    <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                                </button>

                                {isExpanded && (
                                    <div className="chat-messages">
                                        {chatLog.messages.map((msg, idx) => (
                                            <div key={idx} className={`chat-message ${msg.role}`}>
                                                <span className="message-role">{msg.role === "user" ? "You" : chatLog.researcher_name}:</span>
                                                <span className="message-content">{msg.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

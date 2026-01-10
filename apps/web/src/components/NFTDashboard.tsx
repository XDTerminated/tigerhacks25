/**
 * NFT Dashboard Component
 * Displays earned NFTs and allows wallet connection for minting
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useWalletContext, WalletMultiButton } from "../contexts/WalletContext";
import { getEarnedNFTs, getUnmintedNFTs, getGameSessions, type PlanetNFT, type GameSession } from "../services/api";
import "./NFTDashboard.css";

// Helper function to get base color from planet color description
function getBaseColorFromDescription(colorDesc: string): string {
    const lower = colorDesc.toLowerCase();
    if (lower.includes("red") || lower.includes("crimson") || lower.includes("scarlet")) return "#DC143C";
    if (lower.includes("blue") || lower.includes("azure") || lower.includes("cyan")) return "#1E90FF";
    if (lower.includes("green") || lower.includes("emerald") || lower.includes("jade")) return "#228B22";
    if (lower.includes("purple") || lower.includes("violet") || lower.includes("lavender")) return "#9370DB";
    if (lower.includes("orange") || lower.includes("amber")) return "#FF8C00";
    if (lower.includes("yellow") || lower.includes("gold")) return "#FFD700";
    if (lower.includes("brown") || lower.includes("tan") || lower.includes("rust")) return "#8B4513";
    if (lower.includes("white") || lower.includes("frost") || lower.includes("icy")) return "#F0F8FF";
    if (lower.includes("gray") || lower.includes("grey") || lower.includes("silver")) return "#708090";
    return "#4A5568"; // Default dark gray
}

// Planet visualization component
function PlanetVisualization({ planetName, planetColor, planetOcean, nftId }: { planetName: string; planetColor?: string; planetOcean?: string; nftId: number }) {
    if (!planetColor) {
        // Fallback to emoji if no planet data
        return <div className="planet-icon">🪐</div>;
    }

    const oceanCoverage = planetOcean ? parseInt(planetOcean) : 0;
    const baseColor = getBaseColorFromDescription(planetColor);

    return (
        <svg viewBox="0 0 120 120" className="planet-svg-nft">
            <defs>
                <radialGradient id={`planetGradient-nft-${nftId}`}>
                    <stop offset="0%" stopColor={baseColor} stopOpacity="1" />
                    <stop offset="70%" stopColor={baseColor} stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
                </radialGradient>
                <pattern id={`pattern-nft-${nftId}`} width="20" height="20" patternUnits="userSpaceOnUse">
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
                    {planetColor.toLowerCase().includes("cloud") && <ellipse cx="10" cy="10" rx="8" ry="3" fill="rgba(255,255,255,0.3)" />}
                    {planetColor.toLowerCase().includes("streak") && <line x1="0" y1="8" x2="20" y2="12" stroke="rgba(139,0,0,0.4)" strokeWidth="2" />}
                    {planetColor.toLowerCase().includes("ridge") && (
                        <>
                            <rect x="0" y="8" width="20" height="2" fill="rgba(255,255,255,0.5)" />
                            <rect x="0" y="13" width="20" height="1" fill="rgba(255,255,255,0.3)" />
                        </>
                    )}
                </pattern>
            </defs>
            <circle cx="60" cy="60" r="45" fill={`url(#planetGradient-nft-${nftId})`} stroke={baseColor} strokeWidth="1.5" opacity="0.9" />
            <circle cx="60" cy="60" r="45" fill={`url(#pattern-nft-${nftId})`} opacity="0.7" />
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
    );
}

export function NFTDashboard() {
    const { user } = useAuth0();
    const { isConnected, walletAddress, isLoading, mintEarnedNFTs, error } = useWalletContext();
    const [nfts, setNfts] = useState<PlanetNFT[]>([]);
    const [unmintedCount, setUnmintedCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [gameSessions, setGameSessions] = useState<GameSession[]>([]);

    const loadNFTs = useCallback(async () => {
        if (!user?.email) return;

        setLoading(true);
        try {
            const earned = await getEarnedNFTs(user.email);
            setNfts(earned);

            const unminted = await getUnmintedNFTs(user.email);
            setUnmintedCount(unminted.length);

            // Load game sessions to get planet visualization data
            const sessions = await getGameSessions(user.email);
            setGameSessions(sessions);
        } catch (error) {
            console.error("Failed to load NFTs:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.email]);

    useEffect(() => {
        if (user?.email) {
            loadNFTs();
        }
    }, [user?.email, isConnected, loadNFTs]);

    // Find matching game session for an NFT to get planet visualization data
    const getPlanetDataForNFT = (nft: PlanetNFT): { planetColor?: string; planetOcean?: string } => {
        // Try to find a game session that matches this planet
        // Match by planet name and approximate date
        const nftDate = new Date(nft.earned_date);
        const matchingSession = gameSessions.find(
            (session) => session.outcome === "win" && session.selected_planet === nft.planet_name && session.planet_color && Math.abs(new Date(session.end_time || session.start_time).getTime() - nftDate.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        );

        if (matchingSession) {
            return {
                planetColor: matchingSession.planet_color,
                planetOcean: matchingSession.planet_ocean,
            };
        }

        // Fallback: try localStorage
        try {
            // The planet_id might contain game_id info, or we can search localStorage
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith("planet_data_")) {
                    const data = JSON.parse(localStorage.getItem(key) || "{}");
                    if (data.planetName === nft.planet_name) {
                        return {
                            planetColor: data.planetColor,
                            planetOcean: data.oceanCoverage?.toString(),
                        };
                    }
                }
            }
        } catch {
            // Ignore localStorage errors
        }

        return {};
    };

    const handleMintAll = async () => {
        await mintEarnedNFTs();
        // Reload NFTs after minting
        setTimeout(() => {
            loadNFTs();
        }, 2000);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadNFTs();
            if (isConnected) {
                await mintEarnedNFTs();
                // Reload again after minting attempt
                setTimeout(() => {
                    loadNFTs();
                }, 1000);
            }
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="nft-dashboard">
                <div className="nft-loading">Loading NFTs...</div>
            </div>
        );
    }

    return (
        <div className="nft-dashboard">
            <div className="nft-header">
                <div className="header-content">
                    <h1 className="nft-title">Planet Collection</h1>
                    <p className="nft-subtitle">
                        {nfts.length} {nfts.length === 1 ? "NFT" : "NFTs"}
                    </p>
                </div>
                <div className="nft-wallet-section">
                    {isConnected && walletAddress && (
                        <div className="wallet-badge">
                            <span className="wallet-dot"></span>
                            <span className="wallet-address">
                                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                            </span>
                        </div>
                    )}
                    <button className="refresh-button" onClick={handleRefresh} disabled={refreshing || loading} title="Refresh and check for new NFTs">
                        {refreshing ? (
                            <>
                                <span className="spinner-small"></span>
                                <span>Refreshing...</span>
                            </>
                        ) : (
                            <>
                                <span>🔄</span>
                                <span>Refresh</span>
                            </>
                        )}
                    </button>
                    <WalletMultiButton />
                </div>
            </div>

            {error && (
                <div className="nft-error">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {unmintedCount > 0 && (
                <div className="nft-unminted-banner">
                    <div className="unminted-content">
                        <div className="unminted-icon">⏳</div>
                        <div className="unminted-text">
                            <strong>
                                {unmintedCount} unminted NFT{unmintedCount !== 1 ? "s" : ""}
                            </strong>
                            <span>Connect wallet to mint to Solana</span>
                        </div>
                    </div>
                    {isConnected ? (
                        <button className="mint-all-button" onClick={handleMintAll} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    <span>Minting...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨</span>
                                    <span>Mint All</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="connect-hint">Connect wallet above</div>
                    )}
                </div>
            )}

            {nfts.length === 0 ? (
                <div className="nft-empty">
                    <div className="empty-illustration">
                        <div className="empty-icon">🌌</div>
                        <div className="empty-stars">
                            <span>✨</span>
                            <span>⭐</span>
                            <span>✨</span>
                        </div>
                    </div>
                    <h3>No NFTs yet</h3>
                    <p>Win a game to earn your first planet NFT!</p>
                </div>
            ) : (
                <div className="nft-grid">
                    {nfts.map((nft) => (
                        <div key={nft.id} className={`nft-tile ${nft.minted ? "minted" : "unminted"}`}>
                            <div className="nft-tile-content">
                                <div className="nft-visual">
                                    <PlanetVisualization planetName={nft.planet_name} {...getPlanetDataForNFT(nft)} nftId={nft.id} />
                                    {!nft.minted && <div className="pending-overlay">⏳</div>}
                                </div>

                                <div className="nft-info">
                                    <h3 className="nft-planet-name">{nft.planet_name}</h3>
                                    <div className="nft-meta">
                                        <span className="nft-date">
                                            {new Date(nft.earned_date).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                        {nft.minted ? (
                                            <span className="nft-badge minted-badge">
                                                <span className="badge-dot"></span>
                                                Minted
                                            </span>
                                        ) : (
                                            <span className="nft-badge unminted-badge">
                                                <span className="badge-dot"></span>
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {nft.minted && nft.token_id && (
                                    <a href={`https://solscan.io/token/${nft.token_id}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="nft-action-button" onClick={(e) => e.stopPropagation()}>
                                        View on Solscan
                                        <span>→</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

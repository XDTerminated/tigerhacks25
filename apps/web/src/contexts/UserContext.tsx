/**
 * User Context
 * Stores user data from backend (stats, chat history, etc.)
 */

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { createOrGetUser, getPlayerStats, getChatHistory, type UserResponse, type PlayerStats, type ChatMessage } from "../services/api";

interface UserContextType {
    userData: UserResponse | null;
    playerStats: PlayerStats | null;
    chatHistory: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    refreshStats: () => Promise<void>;
    refreshChatHistory: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
    const [userData, setUserData] = useState<UserResponse | null>(null);
    const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user data after authentication
    useEffect(() => {
        async function fetchUserData() {
            if (!isAuthenticated || !user?.email || authLoading) {
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Create or get user (updates last_login)
                const userResponse = await createOrGetUser(user.email);
                setUserData(userResponse);

                // Get player stats
                const stats = await getPlayerStats(user.email);
                setPlayerStats(stats);

                // Get chat history
                const history = await getChatHistory(user.email);
                setChatHistory(history);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Failed to fetch user data";
                console.error("Error fetching user data:", errorMsg);
                setError(errorMsg);
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserData();
    }, [isAuthenticated, user, authLoading]);

    // Refresh stats
    const refreshStats = async () => {
        if (!user?.email) return;

        try {
            const stats = await getPlayerStats(user.email);
            setPlayerStats(stats);
        } catch (err) {
            console.error("Error refreshing stats:", err);
        }
    };

    // Refresh chat history
    const refreshChatHistory = async () => {
        if (!user?.email) return;

        try {
            const history = await getChatHistory(user.email);
            setChatHistory(history);
        } catch (err) {
            console.error("Error refreshing chat history:", err);
        }
    };

    return (
        <UserContext.Provider
            value={{
                userData,
                playerStats,
                chatHistory,
                isLoading,
                error,
                refreshStats,
                refreshChatHistory,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}

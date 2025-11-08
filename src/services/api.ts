/**
 * Backend API Service
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface UserResponse {
  email: string;
  last_login: string;
  created_at: string;
}

export interface PlayerStats {
  email: string;
  correct_guesses: number;
  correct_ejections: number;
  incorrect_guesses: number;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  email: string;
  speaker: string;
  message: string;
  timestamp: string;
}

export interface StatsUpdate {
  email: string;
  correct_guesses?: number;
  correct_ejections?: number;
  incorrect_guesses?: number;
}

export interface GameSession {
  game_id: string;
  email: string;
  start_time: string;
  end_time?: string;
  outcome?: string;
  selected_researcher?: string;
  selected_planet?: string;
}

export interface GameChatMessage {
  role: 'user' | 'assistant';
  content: string;
  message_order: number;
}

export interface GameChatLog {
  game_id: string;
  researcher_name: string;
  planet_name: string;
  timestamp: string;
  outcome?: string;
  messages: GameChatMessage[];
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Create or get user by email (called after Auth0 login)
 */
export async function createOrGetUser(email: string): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create/get user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user by email
 */
export async function getUser(email: string): Promise<UserResponse> {
  const response = await fetch(`${API_BASE_URL}/api/users/${email}`);

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Player Statistics
// ============================================================================

/**
 * Get player statistics
 */
export async function getPlayerStats(email: string): Promise<PlayerStats> {
  const response = await fetch(`${API_BASE_URL}/api/stats/${email}`);

  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update player statistics (incremental)
 */
export async function updatePlayerStats(stats: StatsUpdate): Promise<PlayerStats> {
  const response = await fetch(`${API_BASE_URL}/api/stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stats),
  });

  if (!response.ok) {
    throw new Error(`Failed to update stats: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Chat History (General - kept for backward compatibility)
// ============================================================================

/**
 * Add a chat message to general history
 */
export async function addChatMessage(
  email: string,
  speaker: string,
  message: string
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, speaker, message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add chat message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(
  email: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/${email}?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to get chat history: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Game Sessions
// ============================================================================

/**
 * Create a new game session
 */
export async function createGameSession(
  gameId: string,
  email: string
): Promise<GameSession> {
  const response = await fetch(`${API_BASE_URL}/api/game-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ game_id: gameId, email }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create game session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * End a game session with outcome
 */
export async function endGameSession(
  gameId: string,
  outcome: 'win' | 'lose',
  selectedResearcher: string,
  selectedPlanet: string
): Promise<GameSession> {
  const response = await fetch(`${API_BASE_URL}/api/game-sessions/${gameId}/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      game_id: gameId,
      outcome,
      selected_researcher: selectedResearcher,
      selected_planet: selectedPlanet,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to end game session: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Game Chat Logs
// ============================================================================

/**
 * Save chat log for a researcher in a game session
 */
export async function saveGameChatLog(
  gameId: string,
  email: string,
  researcherName: string,
  planetName: string,
  messages: GameChatMessage[]
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/game-chat-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      game_id: gameId,
      email,
      researcher_name: researcherName,
      planet_name: planetName,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save game chat log: ${response.statusText}`);
  }
}

/**
 * Get all chat logs for a specific researcher across all games
 */
export async function getResearcherChatLogs(
  email: string,
  researcherName: string
): Promise<GameChatLog[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/game-chat-logs/${email}/${researcherName}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get researcher chat logs: ${response.statusText}`);
  }

  return response.json();
}

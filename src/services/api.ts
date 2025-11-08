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
// Chat History
// ============================================================================

/**
 * Add a chat message to history
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

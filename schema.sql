-- Planet Evolution Game Database Schema
-- For use with Neon.tech PostgreSQL

-- Users table to store Auth0 user references
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE NOT NULL,  -- Auth0 user ID
    email VARCHAR(255),
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game runs table to store statistics for each play session
CREATE TABLE game_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Run outcome
    completed BOOLEAN NOT NULL,  -- true if planet became habitable, false if failed
    time_to_habitable INTEGER,   -- seconds it took to make planet habitable (null if failed)
    habitability_score DECIMAL(5,2) NOT NULL,  -- final habitability score (0-100)

    -- Run metadata
    run_duration INTEGER NOT NULL,  -- total duration of the run in seconds

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_game_runs_user_id ON game_runs(user_id);
CREATE INDEX idx_game_runs_completed ON game_runs(completed);
CREATE INDEX idx_game_runs_created_at ON game_runs(created_at DESC);

-- Optional: Leaderboard view for top scores
CREATE VIEW leaderboard AS
SELECT
    u.username,
    gr.habitability_score,
    gr.time_to_habitable,
    gr.completed,
    gr.created_at
FROM game_runs gr
JOIN users u ON gr.user_id = u.id
WHERE gr.completed = true
ORDER BY gr.habitability_score DESC, gr.time_to_habitable ASC
LIMIT 100;

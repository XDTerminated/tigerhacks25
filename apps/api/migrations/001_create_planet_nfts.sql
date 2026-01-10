-- Migration: Create planet_nfts table
-- Run this migration to add NFT support for Solana minting

-- Create planet_nfts table
CREATE TABLE IF NOT EXISTS planet_nfts (
    id SERIAL PRIMARY KEY,
    player_email VARCHAR(255) NOT NULL,
    planet_id VARCHAR(255) NOT NULL,
    planet_name VARCHAR(255) NOT NULL,
    earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    minted BOOLEAN DEFAULT FALSE,
    token_id VARCHAR(255) NULL,
    mint_signature VARCHAR(255) NULL,
    metadata_uri TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_player_email FOREIGN KEY (player_email) REFERENCES users(email) ON DELETE CASCADE,
    CONSTRAINT unique_player_planet UNIQUE (player_email, planet_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_planet_nfts_player_email ON planet_nfts(player_email);
CREATE INDEX IF NOT EXISTS idx_planet_nfts_minted ON planet_nfts(minted);
CREATE INDEX IF NOT EXISTS idx_planet_nfts_token_id ON planet_nfts(token_id) WHERE token_id IS NOT NULL;

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_planet_nfts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on UPDATE
CREATE TRIGGER trigger_update_planet_nfts_updated_at
    BEFORE UPDATE ON planet_nfts
    FOR EACH ROW
    EXECUTE FUNCTION update_planet_nfts_updated_at();


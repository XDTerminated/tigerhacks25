# TigerHacks25 Backend

FastAPI backend for the Planet Evolution social deduction game.

## Tech Stack

- **FastAPI** - Python async web framework
- **PostgreSQL** - Database (via Neon.tech)
- **AsyncPG** - Async PostgreSQL client
- **Pydantic** - Data validation

## Setup

1. Create a `.env` file based on `.env.example`
2. Install dependencies: `pip install -e .`
3. Run migrations: `python run_migration.py`
4. Start server: `python main.py`

## API Endpoints

- `POST /api/users` - Create/get user
- `GET /api/stats/{email}` - Get player statistics
- `POST /api/game-sessions` - Create game session
- `POST /api/nfts/earn` - Earn planet NFT

See `main.py` for full API documentation.

## Solana Integration

The `planet-nft/` directory contains the Anchor smart contract for minting planet NFTs on Solana devnet.

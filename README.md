# Planetary Researchers - Voice Chat Game

An interactive voice chat application where you interview 10 different planetary researchers to identify who is telling the truth about their planet's characteristics. Win to earn NFT rewards on Solana!

## Game Concept

Talk to 10 planetary researchers, each claiming to be from a different planet. Each researcher will tell you about 4 characteristics of their planet:
- Average temperature
- Planet color/appearance
- Ocean coverage percentage
- Gravity

**The Challenge**: 9 of the 10 researchers are imposters who know some facts correctly but lie about others. Only ONE researcher tells the complete truth about all four facts.

Each imposter knows 2 facts correctly and lies about the other 2 facts. Use your conversational skills to identify inconsistencies and find the trustworthy researcher!

## Monorepo Structure

```
tigerhacks25/
├── apps/
│   ├── web/                 # React/Vite frontend
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── api/                 # FastAPI backend
│       ├── main.py
│       ├── migrations/
│       ├── planet-nft/      # Solana Anchor program
│       └── pyproject.toml
├── packages/                # Shared packages (future)
├── turbo.json              # Turborepo configuration
├── pnpm-workspace.yaml     # pnpm workspaces
└── package.json            # Root scripts
```

## Tech Stack

**Frontend (`apps/web`)**
- React 19 + TypeScript + Vite
- Google Gemini AI (conversational responses)
- ElevenLabs (text-to-speech)
- Web Speech API (voice recognition)
- Solana wallet adapters
- Auth0 authentication

**Backend (`apps/api`)**
- Python FastAPI
- PostgreSQL (via Neon.tech)
- AsyncPG for async database operations

**Blockchain (`apps/api/planet-nft`)**
- Solana (devnet)
- Anchor Framework
- Metaplex Token Metadata

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Python 3.11+

### Installation

```bash
# Install pnpm if not installed
npm install -g pnpm

# Install all dependencies
pnpm install

# Install Python dependencies
cd apps/api && pip install -e .
```

### Environment Setup

1. Copy environment templates:
   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

2. Fill in your API keys:
   - `VITE_GEMINI_API_KEY` - Google Gemini API
   - `VITE_ELEVENLABS_API_KEY` - ElevenLabs API
   - `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` - Auth0
   - `DATABASE_URL` - PostgreSQL connection string

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run only frontend
pnpm dev:web

# Run only backend
pnpm dev:api
```

### Build

```bash
# Build all apps
pnpm build

# Build only frontend
pnpm build:web
```

## How to Play

1. Select a planetary researcher from the list
2. Click the microphone button and ask them about their planet
3. Listen to their voice response
4. Take notes about what each researcher tells you
5. Compare answers to find contradictions
6. Identify the one truthful researcher!
7. Win to earn a Planet NFT on Solana

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:api` | Start backend only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |

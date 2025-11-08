"""
Planet Evolution Game Backend API
Handles user management and game run statistics
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os
from contextlib import asynccontextmanager
import asyncpg
from asyncpg.pool import Pool
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# Configuration
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# ============================================================================
# Database Connection Pool
# ============================================================================

db_pool: Optional[Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection pool lifecycle"""
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    print(" Database connection pool created")
    yield
    await db_pool.close()
    print("L Database connection pool closed")


# ============================================================================
# FastAPI App Setup
# ============================================================================

app = FastAPI(
    title="Planet Evolution Game API",
    description="Backend API for planet evolution game with Auth0 integration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Dependency: Database Connection
# ============================================================================


async def get_db():
    """Get database connection from pool"""
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    async with db_pool.acquire() as connection:
        yield connection


# ============================================================================
# Pydantic Models
# ============================================================================


class UserCreate(BaseModel):
    """Request model for creating a user"""

    auth0_id: str = Field(..., description="Auth0 user ID")
    email: Optional[str] = None
    username: Optional[str] = None


class UserResponse(BaseModel):
    """Response model for user data"""

    id: int
    auth0_id: str
    email: Optional[str]
    username: Optional[str]
    created_at: datetime
    updated_at: datetime


class GameRunCreate(BaseModel):
    """Request model for creating a game run"""

    auth0_id: str = Field(..., description="Auth0 user ID")
    completed: bool = Field(..., description="Whether the planet became habitable")
    time_to_habitable: Optional[int] = Field(
        None, description="Seconds to achieve habitability (null if failed)"
    )
    habitability_score: float = Field(
        ..., ge=0, le=100, description="Final habitability score (0-100)"
    )
    run_duration: int = Field(..., description="Total run duration in seconds")


class GameRunResponse(BaseModel):
    """Response model for game run data"""

    id: int
    user_id: int
    completed: bool
    time_to_habitable: Optional[int]
    habitability_score: float
    run_duration: int
    started_at: datetime
    ended_at: datetime
    created_at: datetime


class LeaderboardEntry(BaseModel):
    """Response model for leaderboard entries"""

    username: Optional[str]
    habitability_score: float
    time_to_habitable: Optional[int]
    completed: bool
    created_at: datetime


class UserStatsResponse(BaseModel):
    """Response model for user statistics"""

    total_runs: int
    completed_runs: int
    failed_runs: int
    best_score: Optional[float]
    fastest_time: Optional[int]
    average_score: Optional[float]


# ============================================================================
# Database Functions
# ============================================================================


async def get_or_create_user(
    conn: asyncpg.Connection, auth0_id: str, email: Optional[str], username: Optional[str]
) -> dict:
    """Get existing user or create new one"""
    # Try to get existing user
    user = await conn.fetchrow(
        """
        SELECT id, auth0_id, email, username, created_at, updated_at
        FROM users
        WHERE auth0_id = $1
        """,
        auth0_id,
    )

    if user:
        # Update user info if provided
        if email or username:
            user = await conn.fetchrow(
                """
                UPDATE users
                SET email = COALESCE($2, email),
                    username = COALESCE($3, username),
                    updated_at = CURRENT_TIMESTAMP
                WHERE auth0_id = $1
                RETURNING id, auth0_id, email, username, created_at, updated_at
                """,
                auth0_id,
                email,
                username,
            )
        return dict(user)

    # Create new user
    user = await conn.fetchrow(
        """
        INSERT INTO users (auth0_id, email, username)
        VALUES ($1, $2, $3)
        RETURNING id, auth0_id, email, username, created_at, updated_at
        """,
        auth0_id,
        email,
        username,
    )

    return dict(user)


async def create_game_run(conn: asyncpg.Connection, user_id: int, run_data: GameRunCreate) -> dict:
    """Create a new game run record"""
    game_run = await conn.fetchrow(
        """
        INSERT INTO game_runs (
            user_id, completed, time_to_habitable, habitability_score, run_duration
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, completed, time_to_habitable, habitability_score,
                  run_duration, started_at, ended_at, created_at
        """,
        user_id,
        run_data.completed,
        run_data.time_to_habitable,
        run_data.habitability_score,
        run_data.run_duration,
    )

    return dict(game_run)


async def get_user_stats(conn: asyncpg.Connection, user_id: int) -> dict:
    """Get statistics for a user"""
    stats = await conn.fetchrow(
        """
        SELECT
            COUNT(*) as total_runs,
            COUNT(*) FILTER (WHERE completed = true) as completed_runs,
            COUNT(*) FILTER (WHERE completed = false) as failed_runs,
            MAX(habitability_score) as best_score,
            MIN(time_to_habitable) FILTER (WHERE completed = true) as fastest_time,
            AVG(habitability_score) as average_score
        FROM game_runs
        WHERE user_id = $1
        """,
        user_id,
    )

    return dict(stats)


async def get_leaderboard(conn: asyncpg.Connection, limit: int = 100) -> List[dict]:
    """Get top scores for leaderboard"""
    rows = await conn.fetch(
        """
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
        LIMIT $1
        """,
        limit,
    )

    return [dict(row) for row in rows]


async def get_user_runs(
    conn: asyncpg.Connection, user_id: int, limit: int = 50
) -> List[dict]:
    """Get game runs for a specific user"""
    rows = await conn.fetch(
        """
        SELECT
            id, user_id, completed, time_to_habitable, habitability_score,
            run_duration, started_at, ended_at, created_at
        FROM game_runs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        user_id,
        limit,
    )

    return [dict(row) for row in rows]


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Planet Evolution Game API",
        "version": "1.0.0",
    }


@app.post("/api/users", response_model=UserResponse)
async def create_or_get_user(user_data: UserCreate, conn=Depends(get_db)):
    """
    Create a new user or get existing user by Auth0 ID
    This should be called by the frontend after Auth0 authentication
    """
    try:
        user = await get_or_create_user(
            conn, user_data.auth0_id, user_data.email, user_data.username
        )
        return UserResponse(**user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create/get user: {str(e)}")


@app.get("/api/users/{auth0_id}", response_model=UserResponse)
async def get_user(auth0_id: str, conn=Depends(get_db)):
    """Get user by Auth0 ID"""
    user = await conn.fetchrow(
        """
        SELECT id, auth0_id, email, username, created_at, updated_at
        FROM users
        WHERE auth0_id = $1
        """,
        auth0_id,
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(**dict(user))


@app.post("/api/game-runs", response_model=GameRunResponse)
async def submit_game_run(run_data: GameRunCreate, conn=Depends(get_db)):
    """
    Submit a completed game run
    This should be called by the frontend when a game session ends
    """
    try:
        # Get or create user
        user = await get_or_create_user(conn, run_data.auth0_id, None, None)

        # Create game run
        game_run = await create_game_run(conn, user["id"], run_data)

        return GameRunResponse(**game_run)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit game run: {str(e)}")


@app.get("/api/users/{auth0_id}/stats", response_model=UserStatsResponse)
async def get_user_statistics(auth0_id: str, conn=Depends(get_db)):
    """Get statistics for a specific user"""
    # Get user
    user = await conn.fetchrow(
        "SELECT id FROM users WHERE auth0_id = $1", auth0_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get stats
    stats = await get_user_stats(conn, user["id"])

    return UserStatsResponse(**stats)


@app.get("/api/users/{auth0_id}/runs", response_model=List[GameRunResponse])
async def get_user_game_runs(
    auth0_id: str, limit: int = 50, conn=Depends(get_db)
):
    """Get game run history for a specific user"""
    # Get user
    user = await conn.fetchrow(
        "SELECT id FROM users WHERE auth0_id = $1", auth0_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get runs
    runs = await get_user_runs(conn, user["id"], limit)

    return [GameRunResponse(**run) for run in runs]


@app.get("/api/leaderboard", response_model=List[LeaderboardEntry])
async def get_game_leaderboard(limit: int = 100, conn=Depends(get_db)):
    """
    Get global leaderboard
    Shows top scores sorted by habitability score and time to complete
    """
    try:
        entries = await get_leaderboard(conn, limit)
        return [LeaderboardEntry(**entry) for entry in entries]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}"
        )


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
    )

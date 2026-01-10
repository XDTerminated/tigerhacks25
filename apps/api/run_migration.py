#!/usr/bin/env python3
"""
Database migration runner
Applies SQL migration files to the database
"""
import asyncio
import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")


async def run_migration(migration_file: str):
    """Run a SQL migration file"""
    migration_path = Path(__file__).parent / "migrations" / migration_file
    
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")
    
    print(f"📄 Reading migration file: {migration_path}")
    sql_content = migration_path.read_text()
    
    print(f"🔌 Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        print(f"▶️  Running migration: {migration_file}")
        await conn.execute(sql_content)
        print(f"✅ Migration applied successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        await conn.close()
        print(f"🔌 Database connection closed")


async def main():
    """Main function to run the migration"""
    migration_file = "001_create_planet_nfts.sql"
    
    print("=" * 60)
    print("Database Migration Runner")
    print("=" * 60)
    
    try:
        await run_migration(migration_file)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())


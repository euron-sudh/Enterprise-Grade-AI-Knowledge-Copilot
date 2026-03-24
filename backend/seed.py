"""
Seed script — creates demo and admin users in the database.

Usage:
    python seed.py

Prerequisites:
    - Database must be running (docker-compose up db)
    - Tables must be created (start the API once, or run alembic upgrade head)
"""

import asyncio
import sys
import os

# Ensure we can import from app/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def main():
    from app.database import AsyncSessionLocal, init_db
    from app.models.user import User, UserRole
    from app.core.security import hash_password
    from sqlalchemy import select

    print("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # ── Demo user ──────────────────────────────────────────────────────
        result = await session.execute(
            select(User).where(User.email == "demo@knowledgeforge.ai")
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Demo user already exists: {existing.email} (id={existing.id})")
        else:
            session.add(User(
                name="Demo User",
                email="demo@knowledgeforge.ai",
                hashed_password=hash_password("demo12345"),
                role=UserRole.admin,
                is_active=True,
            ))
            await session.flush()
            print("✓ Demo user created: demo@knowledgeforge.ai / demo12345")

        # ── Admin user ─────────────────────────────────────────────────────
        result2 = await session.execute(
            select(User).where(User.email == "admin@knowledgeforge.ai")
        )
        existing_admin = result2.scalar_one_or_none()
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.email} (id={existing_admin.id})")
        else:
            session.add(User(
                name="Admin",
                email="admin@knowledgeforge.ai",
                hashed_password=hash_password("Admin1234!"),
                role=UserRole.super_admin,
                is_active=True,
            ))
            await session.flush()
            print("✓ Admin user created: admin@knowledgeforge.ai / Admin1234!")

        await session.commit()

    print("\nYou can now log in at http://localhost:3001 with these credentials.")


if __name__ == "__main__":
    asyncio.run(main())

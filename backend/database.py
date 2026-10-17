# ============================================================
# database.py — SQLAlchemy Database Engine & Session Factory
# ============================================================
#
# What this file does (plain English):
#
#   1. Reads your database credentials from the .env file using
#      python-dotenv, so your password never appears in source code.
#
#   2. Builds a "connection string" (DATABASE_URL) in the format
#      that SQLAlchemy + PyMySQL understands:
#          mysql+pymysql://user:password@host:port/database_name
#
#   3. Creates an Engine — the object that actually talks to MySQL.
#
#   4. Creates a SessionLocal factory — every API request will
#      borrow a short-lived "session" from this factory to read/
#      write the database, then return it when done.
#
#   5. Provides a get_db() generator that FastAPI uses as a
#      "dependency injection" — it automatically gives each
#      endpoint a fresh session and closes it afterwards.
#
#   6. Provides init_db() which creates all tables (using
#      CREATE TABLE IF NOT EXISTS under the hood), so it is
#      completely safe to call on every startup — it will never
#      drop or overwrite existing data.
#
# ============================================================

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text, URL
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ──────────────────────────────────────────────
# Step 1 — Load .env file
# ──────────────────────────────────────────────
# load_dotenv() looks for a file called ".env" in the current
# working directory (i.e. the backend/ folder) and loads every
# KEY=VALUE pair into the process environment, so os.getenv()
# can read them.

load_dotenv()

# ──────────────────────────────────────────────
# Step 2 — Read credentials from environment
# ──────────────────────────────────────────────

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")     # NEVER hard-code your password here
DB_NAME = os.getenv("DB_NAME", "inventory_db")


def _check_credentials() -> None:
    """
    Called at startup.  Stops the server immediately with a clear
    message if DB_PASSWORD is missing, instead of letting it fail
    later with a cryptic connection error.
    """
    if not DB_PASSWORD:
        print(
            "\n[database.py] ERROR: DB_PASSWORD is not set!\n"
            "  Please create a .env file in the backend/ folder.\n"
            "  You can copy .env.example and fill in your password:\n\n"
            "      copy .env.example .env   (Windows)\n"
            "      cp   .env.example .env   (Mac/Linux)\n\n"
            "  Then edit .env and replace 'your_mysql_password_here'.\n",
            file=sys.stderr,
        )
        sys.exit(1)  # Hard stop — no password -> no server


_check_credentials()


# ──────────────────────────────────────────────
# Step 3 — Build the Database URL
# ──────────────────────────────────────────────
# Format:  dialect+driver://user:password@host:port/database
#
# "mysql+pymysql" means:
#   • mysql     → use the MySQL dialect
#   • pymysql   → use PyMySQL as the underlying Python driver
#                 (pure Python, no C extension needed)

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT) if DB_PORT else 3306,
    database=DB_NAME,
    query={"charset": "utf8mb4"},
)


# ──────────────────────────────────────────────
# Step 4 — Create the SQLAlchemy Engine
# ──────────────────────────────────────────────
# The engine manages a pool of actual TCP connections to MySQL.
# pool_pre_ping=True means SQLAlchemy will quietly test a connection
# before using it, so stale/timed-out connections are replaced
# automatically.

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,         # Set to True to print every SQL query (useful for debugging)
)


# ──────────────────────────────────────────────
# Step 5 — Session Factory
# ──────────────────────────────────────────────
# SessionLocal is a *class* (a factory).  Calling SessionLocal()
# gives you one database session object.
# autocommit=False → we manually commit/rollback
# autoflush=False  → we control when SQLAlchemy sends pending changes

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ──────────────────────────────────────────────
# Step 6 — Declarative Base
# ──────────────────────────────────────────────
# All ORM model classes (in orm_models.py) inherit from this Base.
# SQLAlchemy uses it to discover which tables to create/manage.

class Base(DeclarativeBase):
    pass


# ──────────────────────────────────────────────
# Step 7 — FastAPI Dependency: get_db()
# ──────────────────────────────────────────────
# Usage in any endpoint:
#
#   from database import get_db
#   from sqlalchemy.orm import Session
#   from fastapi import Depends
#
#   @app.get("/api/v1/products")
#   def my_endpoint(db: Session = Depends(get_db)):
#       ...
#
# FastAPI calls get_db() before the endpoint runs.  It yields a
# fresh session, the endpoint uses it, and then the finally block
# closes the session — even if an error occurred.

def get_db():
    """Yield a database session, then close it when the request ends."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────
# Step 8 — init_db()
# ──────────────────────────────────────────────
# Called once when the FastAPI app starts up (see main.py).
# It uses SQLAlchemy's metadata.create_all() which maps to
# CREATE TABLE IF NOT EXISTS — completely non-destructive.

def init_db() -> None:
    """
    Create the database 'inventory_db' if it does not exist,
    then create all application tables (IF NOT EXISTS).

    Safe to run on every startup.  Never deletes or modifies
    existing tables or data.
    """
    # --- First, create the database itself if missing ----------
    # We connect *without* specifying the DB name, so we can run
    # CREATE DATABASE on a fresh MySQL install.
    base_url = URL.create(
        drivername="mysql+pymysql",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=int(DB_PORT) if DB_PORT else 3306,
        query={"charset": "utf8mb4"},
    )
    bootstrap_engine = create_engine(base_url, pool_pre_ping=True)

    with bootstrap_engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
        conn.commit()

    bootstrap_engine.dispose()   # close bootstrap connection pool

    # --- Now create all tables inside inventory_db -------------
    # We import here (not at the top) to avoid a circular import,
    # because orm_models.py imports Base from this file.
    import orm_models  # noqa: F401  — registers models with Base.metadata

    Base.metadata.create_all(bind=engine)

    # Safe backward-compatible migration for incoming_stock column
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        if "products" in insp.get_table_names():
            columns = [c["name"] for c in insp.get_columns("products")]
            if "incoming_stock" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE products ADD COLUMN incoming_stock INT NOT NULL DEFAULT 0"))
                    conn.commit()
    except Exception as e:
        print(f"[database.py] [WARN] Schema migration check notice: {e}")

    print(f"[database.py] [OK] All tables verified / created in '{DB_NAME}'.")

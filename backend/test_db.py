# ============================================================
# test_db.py — Standalone Database Connection Test Script
# ============================================================
#
# HOW TO RUN:
#   Open a terminal in the backend/ folder and run:
#       .venv\Scripts\python.exe test_db.py   (Windows)
#       .venv/bin/python   test_db.py          (Mac/Linux)
#
# WHAT IT CHECKS:
#   Step 1 - Can Python read the .env file?
#   Step 2 - Can Python connect to MySQL at all?
#   Step 3 - Does the inventory_db database exist?
#   Step 4 - Were all 4 tables created?
#   Step 5 - Are the seed rows present?
# ============================================================

import sys
import os

print("=" * 60)
print("  OptiStock AI - MySQL Connection Test")
print("=" * 60)


# -- Step 1: Load .env ----------------------------------------
print("\n[Step 1] Reading .env file...")
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("         [OK]  .env loaded successfully.")
except ImportError:
    print("         [FAIL] python-dotenv is not installed.")
    print("                Run: .venv\\Scripts\\pip install python-dotenv")
    sys.exit(1)

db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "3306")
db_user = os.getenv("DB_USER", "root")
db_pass = os.getenv("DB_PASSWORD", "")
db_name = os.getenv("DB_NAME", "inventory_db")

print(f"         Host : {db_host}:{db_port}")
print(f"         User : {db_user}")
print(f"         DB   : {db_name}")
print(f"         Pass : {'[SET]' if db_pass else '[NOT SET - FAIL]'}")

if not db_pass:
    print("\n[FAIL] DB_PASSWORD is empty. Edit your .env file and set it.")
    sys.exit(1)


# -- Step 2: Test raw connection to MySQL ---------------------
print("\n[Step 2] Connecting to MySQL server...")
try:
    import pymysql
    conn = pymysql.connect(
        host=db_host,
        port=int(db_port),
        user=db_user,
        password=db_pass,
        connect_timeout=5,
    )
    conn.close()
    print("         [OK]  Connected to MySQL server successfully.")
except Exception as e:
    print(f"         [FAIL] Could not connect to MySQL: {e}")
    print("\n  Troubleshooting tips:")
    print("   - Is MySQL 8.0 running? Check Windows Services for 'MySQL80'.")
    print("   - Is the root password correct in your .env file?")
    print("   - Is port 3306 blocked by a firewall?")
    sys.exit(1)


# -- Step 3: Create inventory_db if missing -------------------
print(f"\n[Step 3] Ensuring database '{db_name}' exists...")
try:
    from sqlalchemy import create_engine, text, URL

    bootstrap_url = URL.create(
        drivername="mysql+pymysql",
        username=db_user,
        password=db_pass,
        host=db_host,
        port=int(db_port) if db_port else 3306,
        query={"charset": "utf8mb4"},
    )
    eng = create_engine(bootstrap_url, pool_pre_ping=True)
    with eng.connect() as c:
        c.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
        c.commit()
        result = c.execute(
            text(
                "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA "
                f"WHERE SCHEMA_NAME = '{db_name}'"
            )
        )
        row = result.fetchone()
    eng.dispose()

    if row:
        print(f"         [OK]  Database '{db_name}' confirmed.")
    else:
        print(f"         [FAIL] Database '{db_name}' was not created.")
        print("                Check that your MySQL user has CREATE DATABASE privileges.")
        sys.exit(1)
except Exception as e:
    print(f"         [FAIL] Database step failed: {e}")
    sys.exit(1)


# -- Step 4: Create tables and seed data ----------------------
print("\n[Step 4] Creating tables and seeding data...")
try:
    from database import init_db, SessionLocal
    from db_seed import seed_all

    init_db()               # CREATE TABLE IF NOT EXISTS for all 4 tables
    db = SessionLocal()
    try:
        seed_all(db)        # Insert rows only if the table is empty
    finally:
        db.close()
    print("         [OK]  Tables created and seed data verified.")
except Exception as e:
    print(f"         [FAIL] Table creation / seeding failed: {e}")
    sys.exit(1)


# -- Step 5: Row count verification ---------------------------
print("\n[Step 5] Verifying row counts in each table...")
try:
    from sqlalchemy import create_engine, text, URL

    app_url = URL.create(
        drivername="mysql+pymysql",
        username=db_user,
        password=db_pass,
        host=db_host,
        port=int(db_port) if db_port else 3306,
        database=db_name,
        query={"charset": "utf8mb4"},
    )
    eng2 = create_engine(app_url)
    with eng2.connect() as c:
        tables = ["products", "sales", "stock_alerts", "abc_items"]
        for tbl in tables:
            result = c.execute(text(f"SELECT COUNT(*) FROM `{tbl}`"))
            count = result.fetchone()[0]
            status = "[OK] " if count > 0 else "[WARN] (empty)"
            print(f"         {status}  {tbl:<20} -> {count} rows")
    eng2.dispose()
except Exception as e:
    print(f"         [FAIL] Row count check failed: {e}")
    sys.exit(1)


# -- All passed -----------------------------------------------
print("\n" + "=" * 60)
print("  ALL CHECKS PASSED")
print(f"  MySQL database '{db_name}' is ready for the FastAPI app.")
print("=" * 60)
print("\n  Start the server with:")
print("      .venv\\Scripts\\uvicorn.exe main:app --reload\n")

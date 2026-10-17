# OptiStock AI — Intelligent Inventory Management & Demand Forecasting System

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4%2B-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0%2B-EB5424.svg)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

OptiStock AI is an end-to-end intelligent inventory management and demand forecasting platform. It bridges statistical forecasting, supervised machine learning, clustering, and automated operations research heuristics to provide inventory optimization, stockout prevention, and SKU classification.

Built with a decoupled architecture featuring a **FastAPI + SQLAlchemy (MySQL)** backend and a **React 19 + TypeScript + Vite** frontend.

---

## Important Notice: Data Provenance & ML Methodology

> **Synthetic Development Benchmark Disclosure**
>
> To support time-series feature engineering (14-day lags, 7/30-day rolling statistics, and annual seasonality curves), machine learning models require extended historical data.
>
> - The repository includes a synthetic development dataset (`backend/data/synthetic_sales_benchmark.csv`) generated via `backend/data_generator.py` containing 730 days of daily demand records across 12 SKUs, all explicitly labeled `data_origin = "SYNTHETIC_BENCHMARK_DEV"`.
> - Organic database sales transactions (`data_origin = "MYSQL_ORGANIC_SALE"`) are layered on top whenever available.
> - **Evaluation metrics ($R^2$, WAPE, Silhouette scores) produced in the development environment demonstrate algorithmic mechanics and pipeline execution, not empirical guarantees of real-world retail forecasting performance.**

---

## Key Features

### 1. Multi-Algorithm Demand Forecasting
- **Candidate Models:** Compares Linear Regression, Random Forest Regressors, and XGBoost Gradient Boosting against historical series.
- **Leak-Free Validation:** Strict chronological train/validation/test splits ensure future demand observations never leak into historical training data.
- **Metric Evaluation:** Automatic champion model selection utilizing Weighted Absolute Percentage Error (WAPE) and $R^2$ variance scoring.
- **Configurable Horizons:** Generates multi-day demand projections (7, 14, 30 days) with confidence intervals.

### 2. Product Intelligence & SKU Analytics
- **Pareto ABC Inventory Classification:** Classifies catalog SKUs into Class A (top 80% value), Class B (next 15%), and Class C (tail 5%) based on Annual Consumption Value or Sales Revenue.
- **K-Means Product Segmentation:** Unsupervised clustering grouping products by demand velocity, demand variability ($CV$), stockout risk ratio, and profit margins, validated via Silhouette scoring.
- **Isolation Forest Anomaly Detection:** Identifies abnormal demand spikes, velocity drops, or erratic sales patterns.

### 3. Inventory Optimization & Prescriptive Recommendations
- **Operational Parameters:** Computes Safety Stock, Dynamic Reorder Points (ROP), Days of Stock Remaining, and Economic Order Quantity (EOQ).
- **Risk Scoring:** Assigns tiered stockout risk indicators (*Optimal*, *Watchlist*, *Critical Reorder*).
- **Actionable Guidance:** Recommends exact replenishment quantities based on lead-time demand variability.

### 4. Interactive ML Model Laboratory
- **Algorithm Catalog:** In-depth documentation of underlying regression and clustering models.
- **Interactive Training:** On-demand experiment execution with hyperparameter tuning controls.
- **Model Leaderboard:** Side-by-side benchmark comparison ranking models across test datasets.

### 5. Catalog & Order Operations
- **Product Management:** Full CRUD operations for SKU metadata, cost/selling price, stock levels, suppliers, and lead times.
- **Sales Transactions:** Direct transaction logging with automated real-time stock deduction and stockout alert triggers.
- **Alert Center:** Threshold-driven inventory alert feed with audit resolution workflows.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+) |
| **ORM & Database Driver** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [PyMySQL](https://pymysql.readthedocs.io/), [cryptography](https://cryptography.io/) |
| **Database** | [MySQL 8.0](https://www.mysql.com/) |
| **Machine Learning** | [scikit-learn](https://scikit-learn.org/), [XGBoost](https://xgboost.readthedocs.io/), [pandas](https://pandas.pydata.org/), [NumPy](https://numpy.org/), [joblib](https://joblib.readthedocs.io/) |
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 8](https://vitejs.dev/) |
| **Styling & Icons** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Data Visualization** | [Recharts](https://recharts.org/) |
| **Code Quality & Testing** | [pytest](https://pytest.org/), [oxlint](https://oxc.rs/) |

---

## Project Structure

```text
.
├── .env.example                     # Root environment variable template
├── .gitignore                       # Root ignore rules (secrets, venvs, binaries)
├── README.md                        # Project documentation
├── backend/
│   ├── .env.example                 # Backend environment variable template
│   ├── .gitignore                   # Backend local gitignore
│   ├── data/
│   │   └── synthetic_sales_benchmark.csv  # 730-day synthetic sales benchmark
│   ├── data_generator.py            # Synthetic benchmark generation script
│   ├── database.py                  # SQLAlchemy engine, session maker, init_db()
│   ├── db_seed.py                   # Idempotent table seeder for initial run
│   ├── inventory_recommendations.py # Safety stock, ROP, EOQ, & recommendation logic
│   ├── main.py                      # FastAPI application entry point and routes
│   ├── ml_forecasting.py            # Feature engineering, model training & forecast logic
│   ├── ml_laboratory.py             # Sandbox experiment runner & model leaderboard
│   ├── models.py                    # Pydantic validation schemas & API contracts
│   ├── orm_models.py                # SQLAlchemy ORM table definitions
│   ├── product_intelligence.py      # ABC Pareto, K-Means clustering, Isolation Forest
│   ├── requirements.txt             # Backend Python dependencies
│   ├── saved_models/
│   │   └── .gitkeep                 # Preserves model artifact directory structure
│   ├── seed_data.py                 # Baseline seed products, sales, and alert definitions
│   ├── test_db.py                   # Database connection and creation verification script
│   └── tests/                       # Automated pytest suite
│       ├── test_forecasting_audit.py
│       ├── test_inventory_recommendations.py
│       ├── test_ml_laboratory.py
│       └── test_product_intelligence.py
└── frontend/
    ├── package.json                 # Node.js dependencies and scripts
    ├── vite.config.ts               # Vite configuration
    ├── tailwind.config.js           # Tailwind CSS configuration
    ├── index.html                   # HTML entry point
    └── src/
        ├── App.tsx                  # Main layout and tab routing
        ├── main.tsx                 # React DOM mount point
        ├── pages/                   # Application views
        │   ├── DashboardPage.tsx
        │   ├── ProductsPage.tsx
        │   ├── SalesPage.tsx
        │   ├── DemandForecastingPage.tsx
        │   ├── InventoryRecommendationsPage.tsx
        │   ├── ProductIntelligencePage.tsx
        │   ├── MlModelLaboratoryPage.tsx
        │   ├── InventoryAlertsPage.tsx
        │   └── SettingsPage.tsx
        ├── components/              # Shared UI cards, tables, dialogs, charts
        ├── services/                # Axios / fetch API client (api.ts)
        └── types/                   # TypeScript interfaces matching backend models
```

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

1. **Python:** Version `3.10` or higher (`python --version`)
2. **Node.js:** Version `18.0` or higher (`node --version`) and `npm` (`npm --version`)
3. **MySQL Server:** Version `8.0` or higher running locally (or accessible via network/Docker)
4. **Git:** (`git --version`)

---

## Environment Configuration

Both the repository root and `backend/` contain a `.env.example` file. 

Create a `.env` file inside `backend/`:

```bash
# Windows (Command Prompt):
copy backend\.env.example backend\.env

# Windows (PowerShell) / Linux / macOS:
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual MySQL server credentials:

```ini
# ── MySQL Connection ──────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=inventory_db

# ── FastAPI Server ───────────────────────────────────────────
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
```

> **Security Note:** Never commit `backend/.env` to version control. It is strictly excluded by `.gitignore`.

---

## Installation & Setup

### 1. Database Initialization

OptiStock AI includes a standalone database diagnostic and initialization script. Ensure your MySQL service is running, then run:

```bash
cd backend
python -m venv .venv

# Activate virtual environment:
# Windows (Command Prompt / PowerShell):
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Verify connection and ensure inventory_db database exists:
python test_db.py
```

`test_db.py` will:
1. Verify that `.env` is loaded and `DB_PASSWORD` is configured.
2. Establish a connection to the MySQL server.
3. Automatically execute `CREATE DATABASE IF NOT EXISTS inventory_db` if not already present.
4. Verify table and schema health.

### 2. Backend Startup

With your virtual environment activated:

```bash
# Run the FastAPI server via Uvicorn:
uvicorn main:app --reload --port 8000
```

On initial startup, `main.py` automatically:
- Creates all database tables (`products`, `sales_transactions`, `stock_alerts`, `abc_items`) using SQLAlchemy's `init_db()`.
- Seeds base inventory records and catalog items if tables are empty using `seed_all()`.

The backend API will be available at `http://localhost:8000`.

### 3. Frontend Startup

Open a separate terminal window:

```bash
cd frontend

# Install JavaScript dependencies:
npm install

# Start the Vite development server:
npm run dev
```

The frontend interface will be available at `http://localhost:5173`.

---

## Testing & Quality Assurance

### Backend Automated Test Suite
OptiStock AI includes an extensive `pytest` suite testing forecasting safety, mathematical boundaries, database sessions, and recommendation algorithms:

```bash
cd backend
pytest tests/ -v
```

**Coverage Breakdown:**
- `tests/test_forecasting_audit.py`: Validates chronological time splits, feature leakage prevention, WAPE calculations, and demand loaders.
- `tests/test_product_intelligence.py`: Checks Pareto cumulative curve sorting, K-Means cluster boundaries, and Silhouette score guarantees.
- `tests/test_inventory_recommendations.py`: Tests Safety Stock formulas, lead time variance handling, and ROP calculations.
- `tests/test_ml_laboratory.py`: Enforces algorithm catalog schema integrity and model leaderboard rankings.

### Frontend Linting & Type Checking
```bash
cd frontend

# Run Oxlint linter:
npm run lint

# Run TypeScript compilation check:
npm run build
```

---

## API Documentation

FastAPI automatically generates interactive OpenAPI documentation when the backend is running:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Primary API Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server and database health check status |
| `GET` | `/api/v1/products` | Retrieve all inventory products with filtering |
| `POST` | `/api/v1/products` | Create a new product SKU |
| `PATCH` | `/api/v1/products/{id}` | Update stock, pricing, or metadata for a SKU |
| `DELETE`| `/api/v1/products/{id}` | Remove a product SKU from inventory |
| `GET` | `/api/v1/sales` | Retrieve historical sales transaction records |
| `POST` | `/api/v1/sales` | Record a sale transaction and adjust inventory levels |
| `GET` | `/api/v1/forecasts/{id}` | Retrieve ML demand forecasts for a product |
| `POST` | `/api/v1/forecasts/run` | Trigger on-demand forecast model retraining |
| `GET` | `/api/v1/recommendations` | Get prescriptive inventory replenishment recommendations |
| `GET` | `/api/v1/intelligence/abc` | Run Pareto ABC classification across catalog |
| `GET` | `/api/v1/intelligence/segmentation` | Run K-Means SKU segmentation analysis |
| `GET` | `/api/v1/intelligence/anomalies` | Detect stock and demand anomalies via Isolation Forest |
| `GET` | `/api/v1/laboratory/catalog` | List educational ML algorithm catalog |
| `POST` | `/api/v1/laboratory/train` | Train and evaluate an algorithm on development benchmark |
| `GET` | `/api/v1/laboratory/leaderboard` | Retrieve algorithm leaderboard benchmark rankings |
| `GET` | `/api/v1/alerts` | Retrieve active stockout and reorder alerts |
| `PATCH`| `/api/v1/alerts/{id}/resolve` | Mark an alert as resolved |
| `GET` | `/api/v1/dashboard` | Aggregated executive KPIs and operational summaries |

---

## System Limitations & Future Roadmap

- **Synchronous ML Execution:** Model training runs in-process via CPU workers. For enterprise scale with tens of thousands of SKUs, inference should be offloaded to asynchronous task queues (e.g., Celery, Redis Queue, or Apache Airflow).
- **Authentication & RBAC:** Currently operating in development mode without multi-tenant authentication or JWT role-based access control.
- **Model Artifact Storage:** Trained `.joblib` models are saved to local disk (`backend/saved_models/`). Production cloud deployments should integrate cloud object storage (e.g., Amazon S3, Google Cloud Storage, or MLflow Model Registry).
- **Real-Time Streaming:** Sales and stock updates are fetched via REST polling; future iterations could introduce WebSockets or Server-Sent Events (SSE) for multi-client synchronization.

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.

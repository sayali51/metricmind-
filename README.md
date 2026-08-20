# MetricMind — Governed Metrics Dashboard & Chat

## Domain

Enterprise Analytics & Agentic AI

## Problem Statement

Giving an LLM raw access to a data warehouse to write its own SQL often
leads to hallucinated joins and inconsistent numbers — the same question
can get different answers depending on phrasing. MetricMind solves this
with a governed semantic layer: every business metric (revenue, profit,
margin) is defined exactly once, and the AI can only _choose_ from these
pre-approved, tested definitions — it never invents a calculation.

## Use Case

A user opens MetricMind and sees a live dashboard of KPIs and charts
built entirely from governed metrics. They can also switch to the chat
page and ask a question in plain English — e.g. _"What's total profit
in North?"_ — and a LangChain agent (running on Groq) picks the correct
governed metric tool, queries Cube.dev's semantic layer, and returns a
consistent, auditable answer with a full trace of which tool ran.

## How It Works, End to End

1. **The browser loads the Next.js app** (`web/`), which has two pages
   sharing one sidebar/topbar shell: the **Dashboard** (`/`) and
   **Ask MetricMind** (`/chat`). The sidebar is the single navigation
   point between them — there's no duplicate "go to chat" button
   scattered around the UI.
2. **The Dashboard page** calls `GET /api/dashboard` on page load and
   renders the response as a KPI row, a revenue trend chart, a
   category-mix donut, and region/category breakdowns — all built with
   Recharts, no numbers hardcoded in the frontend.
3. **The Chat page** posts each question to `POST /api/chat`. The
   response includes the answer text, whether a governed tool was
   actually used (as opposed to a generic reply), and a step-by-step
   trace the UI can expand to show exactly which tool ran with which
   arguments.
4. **Both endpoints live in `api/main.py`**, a small FastAPI app. It
   does not contain any agent or metric logic itself — it just imports
   and calls the existing Python functions in `query_engine/` and
   returns their results as JSON. This keeps the governed-metrics
   behavior identical to before; only the transport changed.
5. **`query_engine/query_engine.py`** holds the LangChain agent. Each
   governed metric (revenue, profit, margin, etc.) is exposed to the
   LLM as a separate `@tool` function — the model's only job is to pick
   the right tool and arguments from the question; it never writes SQL
   or invents a formula.
6. **`query_engine/dashboard_data.py`** queries Cube.dev directly (no
   LLM involved) to fetch the aggregates the dashboard needs.
7. **Every one of those queries is sent to Cube.dev's REST API**, which
   enforces the metric definitions in `cube/model/cubes/orders.yml` —
   the single source of truth for how "revenue" or "profit margin" is
   calculated. Cube.dev is deployed on **Cube Cloud**.
8. **Cube.dev reads from Neon**, a cloud-hosted Postgres database
   seeded with the sales dataset — so the whole backend is reachable
   from anywhere, not just localhost.

## Architecture

```
┌───────────────────────────────────────────┐
│         Next.js frontend (dark theme)     │
│     Dashboard (/)       Chat (/chat)      │
│      shared Sidebar + Topbar shell        │
└───────────────────┬───────────────────────┘
                     │  fetch() — JSON over HTTP
                     ▼
┌───────────────────────────────────────────┐
│           FastAPI backend (api/main.py)   │
│   GET  /api/dashboard    POST /api/chat   │
│     (thin wrapper — no agent logic here)  │
└───────────────────┬───────────────────────┘
                     │
       ┌─────────────┴──────────────┐
       │                            │
dashboard_data.py             query_engine.py
(direct Cube queries           (LangChain + Groq
 for charts/KPIs)               agent picks a tool)
       │                            │
       └─────────────┬──────────────┘
                     │
             Cube.dev REST API
         (governed semantic layer,
          deployed on Cube Cloud)
                     │
              Neon Postgres
            (cloud-hosted, seeded)
```

| Layer          | Implementation                              | Why                                                                    |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Frontend       | Next.js (App Router) + Tailwind + Recharts   | Dashboard and chat as separate routes sharing one sidebar/topbar shell   |
| API            | FastAPI (`api/main.py`)                      | Thin REST bridge — imports the same agent/query functions, unchanged    |
| Orchestrator   | LangChain + Groq (Llama 3.3-70B)             | LLM only _selects_ a governed tool — never writes raw SQL               |
| Semantic Layer | Cube.dev, deployed on **Cube Cloud**         | Every metric defined exactly once — single source of truth              |
| Data Warehouse | **Neon** (cloud-hosted Postgres)             | Real relational database, reachable from anywhere, not just localhost   |

**Why FastAPI sits in the middle:** the LangChain agent and Cube-query
helpers in `query_engine/` were originally called directly from a
Streamlit script running in the same Python process as the UI (see
`ui/app.py`, kept as a reference/fallback). Moving the frontend to
Next.js meant the UI became a separate JS process, so `api/main.py`
exposes those same Python functions over two small JSON endpoints
instead of importing them in-process. No agent or metric logic changed
— only how the UI reaches it.

## Project Structure

```
metricmind-/
├── api/
│   └── main.py                 # FastAPI bridge — /api/dashboard, /api/chat
├── web/                         # Next.js frontend
│   ├── app/
│   │   ├── page.tsx             # Dashboard route ("/")
│   │   ├── chat/page.tsx        # Chat route ("/chat")
│   │   ├── components/Shell.tsx # Shared Sidebar + Topbar (single nav point)
│   │   └── layout.tsx, globals.css
│   └── tailwind.config.ts       # Dark "ledger" color theme, shared by both pages
├── cube/                        # Cube.dev semantic layer (local dev copy)
│   ├── docker-compose.yml       # Postgres + Cube containers (local fallback)
│   ├── model/cubes/orders.yml   # Governed metric/dimension definitions
│   └── seed.sql                 # Loads the dataset into Postgres
├── data/                        # Source CSV dataset
├── query_engine/
│   ├── query_engine.py          # LangChain agent — chat tools
│   └── dashboard_data.py        # Direct Cube queries for dashboard charts/KPIs
├── ui/
│   └── app.py                   # Earlier Streamlit UI — kept as reference/fallback
├── metrics/, tests/test_metrics.py   # Earlier local-Pandas prototype (reference only)
├── tests/                        # Automated Python test suite
└── docs_and_demo/
    └── DEMO_SCRIPT.md            # Exact demo walkthrough
```

## Setup — Option A: Use the deployed cloud backend (recommended, fastest)

No Docker needed. Just point at the live Cube Cloud deployment and run
the API and frontend side by side.

**1. Set your `.env`** (repo root):

```
GROQ_API_KEY=your_key_here
CUBE_API_URL=https://harsh-gassaway.aws-us-west-2.cubecloudapp.dev/cubejs-api/v1/load
CUBE_API_TOKEN=your_cube_cloud_api_token
```

(Get the token from Cube Cloud → your deployment → API Credentials →
REST API tab → reveal token.)

**2. Install Python dependencies and start the API:**

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

**3. In a second terminal, install and start the frontend:**

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend defaults to
`http://localhost:8000` for API calls; override this by setting
`NEXT_PUBLIC_API_URL` in `web/.env.local` if your API runs elsewhere.

That's it — no Postgres, no Docker, no seeding required, since the
cloud database is already live and populated.

## Setup — Option B: Full local stack (fallback, e.g. if cloud deployment is unavailable)

**1. Start Cube + Postgres locally:**

```bash
cd cube
docker-compose up
```

Requires `cube/.env` (git-ignored):

```
CUBEJS_DB_TYPE=postgres
CUBEJS_DB_HOST=postgres
CUBEJS_DB_NAME=sales
CUBEJS_DB_USER=cube
CUBEJS_DB_PASS=cube
CUBEJS_API_SECRET=devsecret123
CUBEJS_DEV_MODE=true
```

**2. Seed the database** (once per machine):

```bash
docker cp data/raw_sales.csv cube-postgres-1:/raw_sales.csv
docker exec -i cube-postgres-1 psql -U cube -d sales < cube/seed.sql
```

**3. Point your root `.env` at localhost instead:**

```
CUBE_API_URL=http://localhost:4000/cubejs-api/v1/load
CUBE_API_TOKEN=
```

**4. Run the API and frontend** as in Option A, steps 2–3.

## Features

** Dashboard (`/`)**

- KPI cards: total revenue, profit, orders, profit margin
- Revenue trend over time (area chart)
- Revenue mix by category (donut chart with legend)
- Revenue by region and category breakdowns
- All data pulled live from Cube.dev via `/api/dashboard` — nothing
  hardcoded in the frontend

** Chat (`/chat`)**

- Ask any governed-metric question in plain English
- Full audit trail — every answer shows exactly which governed metric
  tool produced it, expandable per message
- Input guardrails — empty or excessively long questions are rejected
  before reaching the LLM
- Graceful handling when Cube isn't reachable, or when a question can't
  be mapped to any governed metric

**Shared shell** — both pages use the same dark sidebar/topbar
(`web/app/components/Shell.tsx`), so there is exactly one navigation
path between the dashboard and chat, with no duplicate CTAs.

**Governed metrics currently defined**: revenue, profit, quantity, order
count, discount totals/averages, discounted sales, shipping cost,
average order value, average profit, high-value/loss/profitable/
discounted order counts, loss value, profit margin, discount rate,
shipping cost ratio, revenue per order, profit per order — 19 measures,
each defined exactly once.

## Testing

**Backend unit tests (fast, no setup needed):**

```bash
python -m pytest tests/ -v
```

**Live integration tests** (hits whichever Cube URL is set in `.env` —
cloud or local, depending on your setup):

```bash
python -m pytest tests/test_query_engine.py -m live -v
```

**Frontend type-check:**

```bash
cd web
npx tsc --noEmit
```

## Status

-  Cube.dev semantic layer — deployed on **Cube Cloud**, connected to
  **Neon** (cloud Postgres), verified via curl and live tests
-  LangChain + Groq agent — connected to the deployed Cube REST API
- FastAPI bridge — `/api/dashboard` and `/api/chat`, both tested
  against a running frontend
-  Next.js frontend — Dashboard and Chat pages on a shared dark shell
-  Automated tests — unit (mocked) + live integration, all passing
  against the cloud deployment

## Notes for the Team

- The cloud backend (Cube Cloud + Neon) is now the primary way to run
  this app — no Docker required for day-to-day development.
- Local Docker setup (Option B) remains as a fallback if the cloud
  deployment has issues or access changes.
- `.env` (root) and `cube/.env` are both git-ignored — get the current
  cloud API token from whoever manages the Cube Cloud deployment.
- `ui/app.py` (Streamlit) was the original frontend before the move to
  Next.js — kept as a reference/fallback since it talks to the exact
  same `query_engine/` functions.
- `metrics/` and `tests/test_metrics.py` are the original local-Pandas
  prototype from before the Cube.dev migration — kept as reference.

## Scope note (for reviewers)

The original brief specified Cube.dev/dbt + LangChain + Snowflake/
Databricks + Next.js + Tremor. This implementation keeps the parts that
define the project's core idea — a real, cloud-deployed semantic layer
(Cube.dev + Neon) and real agentic orchestration (LangChain) — and now
also matches the originally specified frontend framework (Next.js,
with Recharts in place of Tremor) after migrating from an earlier
Streamlit prototype. This is a deliberate, documented scope decision.

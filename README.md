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
built entirely from governed metrics. They can also ask a question in
plain English — e.g. _"What's total profit in North?"_ — and a LangChain
agent (running on Groq) picks the correct governed metric tool, queries
Cube.dev's semantic layer, and returns a consistent, auditable answer.

## Architecture

```
┌─────────────────────────────────────────┐
│        Streamlit UI (dark themed)         │
│   📈 Dashboard tab   💬 Chat tab          │
└───────────────┬───────────────────────────┘
                │
     ┌──────────┴───────────┐
     │                       │
dashboard_data.py      query_engine.py
(direct Cube queries    (LangChain + Groq
 for charts/KPIs)        agent picks a tool)
     │                       │
     └──────────┬───────────┘
                │
        Cube.dev REST API
     (governed semantic layer,
      deployed on Cube Cloud)
                │
         Neon Postgres
        (cloud-hosted, seeded)
```

| Layer          | Implementation                       | Why                                                                   |
| -------------- | ------------------------------------ | --------------------------------------------------------------------- |
| UI             | Streamlit, custom dark theme         | Dashboard + chat in one app                                           |
| Orchestrator   | LangChain + Groq (Llama 3.3-70B)     | LLM only _selects_ a governed tool — never writes raw SQL             |
| Semantic Layer | Cube.dev, deployed on **Cube Cloud** | Every metric defined exactly once — single source of truth            |
| Data Warehouse | **Neon** (cloud-hosted Postgres)     | Real relational database, reachable from anywhere, not just localhost |

## Deployment Status

**Backend (Cube.dev + Postgres): fully cloud-deployed.**

- Database: Neon (free-tier Postgres), seeded with the sales dataset
- Semantic layer: Cube Cloud, connected to Neon
- Verified working via direct REST API call (`curl`) and via the app's
  own live integration tests — not just "it compiled," but confirmed
  returning real data end to end

**Frontend (Streamlit): currently local only.**
Runs on `localhost:8501` for development/testing. Deploying it publicly
(Streamlit Community Cloud) is a separate step — see below — that
requires no backend changes, since the backend is already reachable
over the internet.

## Project Structure

```
metricmind-/
├── .streamlit/
│   └── config.toml            # Native dark theme config
├── cube/                       # Cube.dev semantic layer (local dev copy)
│   ├── docker-compose.yml      # Postgres + Cube containers (local fallback)
│   ├── model/cubes/orders.yml  # Governed metric/dimension definitions
│   └── seed.sql                # Loads the dataset into Postgres
├── data/                       # Source CSV dataset
├── query_engine/
│   ├── query_engine.py         # LangChain agent — chat tools
│   └── dashboard_data.py       # Direct Cube queries for dashboard charts/KPIs
├── ui/
│   └── app.py                  # Streamlit app — Dashboard + Chat tabs
├── metrics/, tests/test_metrics.py   # Earlier local-Pandas prototype (reference only)
├── tests/                       # Automated test suite
└── docs_and_demo/
    └── DEMO_SCRIPT.md           # Exact demo walkthrough
```

## Setup — Option A: Use the deployed cloud backend (recommended, fastest)

No Docker needed. Just point at the live Cube Cloud deployment.

**1. Set your `.env`** (repo root):

```
GROQ_API_KEY=your_key_here
CUBE_API_URL=https://harsh-gassaway.aws-us-west-2.cubecloudapp.dev/cubejs-api/v1/load
CUBE_API_TOKEN=your_cube_cloud_api_token
```

(Get the token from Cube Cloud → your deployment → API Credentials →
REST API tab → reveal token.)

**2. Install dependencies and run:**

```bash
pip install -r requirements.txt
pip install langchain-groq requests
python -m streamlit run ui/app.py
```

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

**4. Run the app** as in Option A, step 2.

## Features

**📈 Dashboard tab**

- KPI cards: total revenue, profit, orders, high-value order count
- Revenue by region, revenue by category (bar charts)
- Monthly revenue trend (line chart)
- All data pulled live from Cube.dev — nothing hardcoded

**💬 Chat tab**

- Ask any governed-metric question in plain English
- Full audit trail — every answer shows exactly which governed metric
  tool produced it
- Input guardrails — empty or excessively long questions are rejected
  before reaching the LLM
- Graceful handling when Cube isn't reachable, or when a question can't
  be mapped to any governed metric

**Governed metrics currently defined**: revenue, profit, quantity, order
count, discount totals/averages, discounted sales, shipping cost,
average order value, average profit, high-value/loss/profitable/
discounted order counts, loss value, profit margin, discount rate,
shipping cost ratio, revenue per order, profit per order — 19 measures,
each defined exactly once.

## Testing

**Unit tests (fast, no setup needed):**

```bash
python -m pytest tests/ -v
```

**Live integration tests** (hits whichever Cube URL is set in `.env` —
cloud or local, depending on your setup):

```bash
python -m pytest tests/test_query_engine.py -m live -v
```

## Status

- ✅ Cube.dev semantic layer — deployed on **Cube Cloud**, connected to
  **Neon** (cloud Postgres), verified via curl and live tests
- ✅ LangChain + Groq agent — connected to the deployed Cube REST API
- ✅ Dashboard tab — live KPIs and charts
- ✅ Chat tab — governed Q&A with audit trail and guardrails
- ✅ Dark theme — native Streamlit theming + custom styling
- ✅ Automated tests — unit (mocked) + live integration, all passing
  against the cloud deployment

## Notes for the Team

- The cloud backend (Cube Cloud + Neon) is now the primary way to run
  this app — no Docker required for day-to-day development.
- Local Docker setup (Option B) remains as a fallback if the cloud
  deployment has issues or access changes.
- `.env` (root) and `cube/.env` are both git-ignored — get the current
  cloud API token from whoever manages the Cube Cloud deployment.
- `metrics/` and `tests/test_metrics.py` are the original local-Pandas
  prototype from before the Cube.dev migration — kept as reference.

## Scope note (for reviewers)

The original brief specified Cube.dev/dbt + LangChain + Snowflake/
Databricks + Next.js + Tremor. This implementation keeps the parts that
define the project's core idea — a real, now cloud-deployed semantic
layer (Cube.dev + Neon) and real agentic orchestration (LangChain) —
and simplifies the frontend framework (Streamlit instead of Next.js/
Tremor) to match the team's skillset and timeline. This is a deliberate,
documented scope decision.

# MetricMind — Governed Metrics Dashboard & Chat

## Domain
Enterprise Analytics & Agentic AI

## Problem Statement
Giving an LLM raw access to a data warehouse to write its own SQL often
leads to hallucinated joins and inconsistent numbers — the same question
can get different answers depending on phrasing. MetricMind solves this
with a governed semantic layer: every business metric (revenue, profit,
margin) is defined exactly once, and the AI can only *choose* from these
pre-approved, tested definitions — it never invents a calculation.

## Use Case
A user opens MetricMind and sees a live dashboard of KPIs and charts
built entirely from governed metrics. They can also ask a question in
plain English — e.g. *"What's total profit in North?"* — and a LangChain
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
       (governed semantic layer)
                │
            Postgres
        (Docker, seeded data)
```

| Layer | Implementation | Why |
|---|---|---|
| UI | Streamlit, custom dark theme | Dashboard + chat in one app, built with tools the team already knew |
| Orchestrator | LangChain + Groq (Llama 3.3-70B) | LLM only *selects* a governed tool — never writes raw SQL or calculates numbers itself |
| Semantic Layer | Cube.dev (`cube/model/cubes/orders.yml`) | Every metric defined exactly once — single source of truth |
| Data Warehouse | Postgres, via Docker | Real relational database backing the semantic layer |

## Project Structure

```
metricmind-/
├── .streamlit/
│   └── config.toml            # Native dark theme config
├── cube/                       # Cube.dev semantic layer
│   ├── docker-compose.yml      # Postgres + Cube containers
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

## Setup (full stack, from scratch)

**1. Start Cube + Postgres:**
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

**2. Seed the database** (once per machine, new terminal):
```bash
docker cp data/raw_sales.csv cube-postgres-1:/raw_sales.csv
docker exec -i cube-postgres-1 psql -U cube -d sales < cube/seed.sql
```

**3. Verify Cube is working:** open `http://localhost:4000`, run a test
query on `revenue` — should return a real number.

**4. Install dependencies and run the app:**
```bash
pip install -r requirements.txt
pip install langchain-groq requests
python -m streamlit run ui/app.py
```
Requires a root-level `.env`:
```
GROQ_API_KEY=your_key_here
CUBE_API_URL=http://localhost:4000/cubejs-api/v1/load
CUBE_API_TOKEN=
```

## Features

**📈 Dashboard tab**
- KPI cards: total revenue, profit, orders, high-value order count
- Revenue by region (bar chart)
- Revenue by category (bar chart)
- Monthly revenue trend (line chart)
- All data pulled live from Cube.dev — nothing hardcoded

**💬 Chat tab**
- Ask any governed-metric question in plain English
- Full audit trail — every answer shows exactly which governed metric
  tool produced it
- Input guardrails — empty or excessively long questions are rejected
  before reaching the LLM
- Graceful handling when Cube/Docker isn't reachable, or when a question
  can't be mapped to any governed metric (proves the system doesn't
  guess)

**Governed metrics currently defined** (in `orders.yml`): revenue,
profit, quantity, order count, discount totals/averages, discounted
sales, shipping cost, average order value, average profit, high-value
order count, loss-order count, profitable-order count, discounted-order
count, loss value — 14+ measures, each defined exactly once.

## Testing

**Unit tests (fast, no setup needed):**
```bash
python -m pytest tests/ -v
```
Runs instantly — covers metric logic and Cube query handling using
mocked HTTP responses, no Docker/Cube/Postgres required.

**Live integration tests (requires the full stack running):**
```bash
python -m pytest tests/test_query_engine.py -m live -v
```
Hits the real running Cube instance and confirms actual data comes back
correctly.

Both are configured via `pytest.ini` so the default `pytest tests/` run
never fails just because Docker isn't running.

## Status

- ✅ Cube.dev semantic layer — running, Postgres-backed, a real
  MySQL-vs-Postgres schema bug found and fixed
- ✅ LangChain + Groq agent — connected to Cube's REST API, tested
  end to end
- ✅ Dashboard tab — live KPIs and charts, not hardcoded
- ✅ Chat tab — governed Q&A with full audit trail and guardrails
- ✅ Dark theme — native Streamlit theming + custom styling
- ✅ Automated tests — unit (mocked) + live integration, all passing
- ✅ Demo script — exact walkthrough ready in `docs_and_demo/`
- 🔄 Team's parallel FastAPI/Next.js layer (in progress, reuses the
  same `answer_question` logic — complementary, not conflicting)
- ❌ Not yet done: deployment beyond localhost, top-selling
  category/monthly-trend chat tools (written, pending final test+push)

## Notes for the Team

- `cube/.env` and root `.env` are git-ignored — each person needs their
  own local copy.
- Postgres data is local to each machine's Docker volume — after
  `docker-compose up`, run the seed step once, or dashboard/chat
  queries will return empty.
- `metrics/` and `tests/test_metrics.py` are the original local-Pandas
  prototype from before the Cube.dev migration — kept as reference,
  not used by the live app.
- `.streamlit/config.toml` must live at the repo root (not inside
  `ui/`) for the dark theme to apply correctly.
experience level (Postgres instead of Snowflake, Streamlit instead of
Next.js/Tremor). This is a deliberate, documented scope decision, not an
oversight.

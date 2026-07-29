# MetricMind — Governed Metrics Chat (Agentic BI)

## Domain
Enterprise Analytics & Agentic AI

## Problem Statement
Giving an LLM raw access to a data warehouse to write its own SQL often
leads to hallucinated joins and inconsistent numbers. MetricMind solves
this by having the LLM orchestrate against a governed **Cube.dev semantic
layer** instead of writing raw SQL — every metric (revenue, profit,
margin) is defined once, in one place, so the answer is always
mathematically consistent no matter who asks or how.

## Use Case
A user asks MetricMind, *"What's total profit in North?"* A LangChain
agent (running on Groq) reads the question, picks the correct governed
metric tool, sends a query to Cube.dev's REST API, and returns the real,
consistent number — the LLM never touches raw data or writes SQL itself.

## Architecture (current, working end-to-end)

| Layer | Implementation |
|---|---|
| Semantic Layer | **Cube.dev** (`cube/model/cubes/orders.yml`) — governed metric/dimension definitions |
| Data Warehouse | **Postgres**, running via Docker, seeded from the Palmbridge sales dataset |
| Agentic Orchestrator | **LangChain + Groq** (`query_engine/query_engine.py`) — LLM picks a governed tool, never calculates numbers itself |
| API Layer | **FastAPI** (`api/main.py`) — thin REST wrapper around the agent, exposing `POST /api/chat` |
| Conversational Interface | **Next.js** (`web/`) — chat UI with full audit trail (shows which metric was used for every answer) |

The interface was migrated from an earlier Streamlit prototype (`ui/app.py`,
kept for reference) to a Next.js frontend backed by FastAPI, without any
changes to the underlying agent or semantic layer logic.

## Project Structure

```
metricmind-/
├── api/                       # FastAPI wrapper around the LangChain agent
│   └── main.py                # Exposes POST /api/chat, GET /api/health
├── cube/                      # Cube.dev semantic layer
│   ├── docker-compose.yml     # Postgres + Cube containers
│   ├── model/cubes/orders.yml # Governed metric/dimension definitions
│   └── seed.sql               # Loads the dataset into Postgres
├── data/                      # Source CSV dataset
├── query_engine/              # LangChain agent, queries Cube's REST API
├── web/                       # Next.js chat interface (current UI)
├── ui/                        # Earlier Streamlit chat interface (reference/rollback)
├── metrics/, tests/           # Earlier local-Pandas prototype (kept for reference)
└── docs_and_demo/             # Architecture notes
```

## Setup (full stack, from scratch)

Three services run together: Docker (Postgres + Cube.dev), the FastAPI
backend, and the Next.js frontend.

**1. Start Cube + Postgres:**
```bash
cd cube
docker compose up
```
Requires a `cube/.env` file (git-ignored — ask a teammate for the values,
or use):
```
CUBEJS_DB_HOST=postgres
CUBEJS_DB_PORT=5432
CUBEJS_DB_NAME=sales
CUBEJS_DB_USER=cube
CUBEJS_DB_PASS=cube
CUBEJS_DB_TYPE=postgres
CUBEJS_API_SECRET=devsecret123
CUBEJS_EXTERNAL_DEFAULT=true
CUBEJS_SCHEDULED_REFRESH_DEFAULT=true
CUBEJS_DEV_MODE=true
CUBEJS_SCHEMA_PATH=model
```
`CUBEJS_DB_HOST=postgres` and the `cube`/`cube` credentials match the
`postgres` service defined in `docker-compose.yml` — these aren't personal
credentials, they're fixed dev values for the containerized database.

**2. Seed the database** (once, per machine — in a new terminal, from the
project root):
```bash
docker cp data/raw_sales.csv cube-postgres-1:/raw_sales.csv
docker exec -i cube-postgres-1 psql -U cube -d sales < cube/seed.sql
```
On Windows PowerShell, use `Get-Content` instead of `<`:
```powershell
Get-Content cube/seed.sql | docker exec -i cube-postgres-1 psql -U cube -d sales
```

**3. Verify Cube is working:** open `http://localhost:4000`, run a test
query on the `revenue` measure — should return a real number.

**4. Start the FastAPI backend** (from the project root, in a new terminal):
```bash
pip install -r requirements.txt
pip install langchain-groq requests fastapi uvicorn
python -m uvicorn api.main:app --reload --port 8000
```
Requires a root-level `.env` with:
```
GROQ_API_KEY=your_key_here
CUBE_API_URL=http://localhost:4000/cubejs-api/v1/load
CUBE_API_TOKEN=
```
Verify it's running: open `http://localhost:8000/api/health` — should
return `{"status":"ok"}`.

**5. Start the Next.js frontend** (in a new terminal):
```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```
Open `http://localhost:3000`. If Next.js starts on a different port
(e.g. `3001`) because 3000 is already in use, either free up port 3000 or
add the new port to `allow_origins` in `api/main.py`, since the backend's
CORS settings only allow explicitly listed origins.

## Example Questions

- "What's total sales in South?"
- "What's total profit in North?"
- "How many high value orders are there?"
- "How many loss-making orders are there?"
- "How many discounted orders are there?"
- "What's the overall profit margin?"
- "Why is profit low in the Central region?"

## Testing

The project has two layers of automated tests:

**Unit tests (fast, no setup needed):**
```bash
python -m pytest tests/ -v
```
Runs 14 tests instantly — covers the original Pandas metric functions
(`test_metrics.py`) and the Cube.dev query logic (`test_query_engine.py`)
using mocked HTTP responses, so no Docker/Cube/Postgres needs to be
running.

**Live integration tests (requires the full stack running):**
```bash
python -m pytest tests/test_query_engine.py -m live -v
```
Actually hits your running Cube instance at `localhost:4000` and confirms
real data comes back correctly. Run this after `docker compose up` +
seeding, especially after changing `orders.yml` or the Docker setup, to
confirm the live connection still works end to end.

Both test types are skippable independently — the default `pytest tests/`
run never fails just because Docker isn't running, since live tests are
excluded by default (configured in `pytest.ini`).

## Status (updated)

- ✅ Cube.dev semantic layer defined and running (Postgres-backed)
- ✅ Fixed a real MySQL-vs-Postgres config bug in `cube/.env` and
  `orders.yml` column syntax
- ✅ LangChain + Groq agent connected to Cube's REST API — tested working
  end to end
- ✅ FastAPI backend (`api/main.py`) exposing the agent as a REST endpoint
- ✅ Next.js chat UI (`web/`) with governance audit trail — replaces the
  earlier Streamlit prototype as the primary interface
- ✅ Streamlit chat UI (`ui/app.py`) kept and still functional as a
  fallback/reference
- ✅ **16/16 automated tests passing** — 14 unit tests (mocked, instant)
  + 2 live integration tests (verified against the real running stack)
- 🔄 Next: expand metric coverage (margin ratio), input guardrails,
  friendlier error handling if Docker isn't running, fix a display bug
  where the "governed metric" count is sometimes off by one, dynamic
  chart rendering, "view SQL/API call" transparency buttons
- Postgres data is **local to each machine's Docker volume** — after
  `docker compose up`, you must run the seed step above once, or queries
  will return empty results.
- `metrics/` and `tests/` contain an earlier local-Pandas prototype of
  the same concept, kept for reference/comparison — the live app now
  uses Cube.dev instead.
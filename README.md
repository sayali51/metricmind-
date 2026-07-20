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
| Conversational Interface | **Streamlit** (`ui/app.py`) — chat UI with full audit trail (shows which metric was used for every answer) |

This matches the original brief's architecture (real semantic layer, real
agentic orchestration) using tools that are actually running and tested,
rather than a theoretical spec.

## Project Structure

```
metricmind-/
├── cube/                      # Cube.dev semantic layer
│   ├── docker-compose.yml     # Postgres + Cube containers
│   ├── model/cubes/orders.yml # Governed metric/dimension definitions
│   └── seed.sql               # Loads the dataset into Postgres
├── data/                      # Source CSV dataset
├── query_engine/              # LangChain agent, queries Cube's REST API
├── ui/                        # Streamlit chat interface
├── metrics/, tests/           # Earlier local-Pandas prototype (kept for reference)
└── docs_and_demo/             # Architecture notes
```

## Setup (full stack, from scratch)

**1. Start Cube + Postgres:**
```bash
cd cube
docker-compose up
```
Requires a `cube/.env` file (git-ignored — ask a teammate for the values,
or use):
```
CUBEJS_DB_TYPE=postgres
CUBEJS_DB_HOST=postgres
CUBEJS_DB_NAME=sales
CUBEJS_DB_USER=cube
CUBEJS_DB_PASS=cube
CUBEJS_API_SECRET=devsecret123
CUBEJS_DEV_MODE=true
```

**2. Seed the database** (once, per machine — in a new terminal):
```bash
docker cp data/raw_sales.csv cube-postgres-1:/raw_sales.csv
docker exec -i cube-postgres-1 psql -U cube -d sales < cube/seed.sql
```

**3. Verify Cube is working:** open `http://localhost:4000`, run a test
query on the `revenue` measure — should return a real number.

**4. Install Python dependencies and run the chat app:**
```bash
pip install -r requirements.txt
pip install langchain-groq requests
python -m streamlit run ui/app.py
```
Requires a root-level `.env` with:
```
GROQ_API_KEY=your_key_here
CUBE_API_URL=http://localhost:4000/cubejs-api/v1/load
CUBE_API_TOKEN=
```

## Example Questions

- "What's total sales in South?"
- "What's total profit in North?"
- "How many high value orders are there?"
- "How many loss-making orders are there?"
- "How many discounted orders are there?"

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
real data comes back correctly. Run this after `docker-compose up` + 
seeding, especially after changing `orders.yml` or the Docker setup, to
confirm the live connection still works end to end.

Both test types are skippable independently — the default `pytest tests/`
run never fails just because Docker isn't running, since live tests are
excluded by default (configured in `pytest.ini`).

## Status (updated)

- ✅ Cube.dev semantic layer defined and running (Postgres-backed)
- ✅ Fixed a real MySQL-vs-Postgres column syntax bug in `orders.yml`
- ✅ LangChain + Groq agent connected to Cube's REST API — tested working
  end to end
- ✅ Streamlit chat UI with governance audit trail
- ✅ **16/16 automated tests passing** — 14 unit tests (mocked, instant)
  + 2 live integration tests (verified against the real running stack)
- 🔄 Next: expand metric coverage (margin ratio), input guardrails,
  friendlier error handling if Docker isn't running

## Notes for the Team

- `cube/.env` is git-ignored — each person needs their own copy locally
  (same values should work for local dev).
- Postgres data is **local to each machine's Docker volume** — after
  `docker-compose up`, you must run the seed step above once, or queries
  will return empty results.
- `metrics/` and `tests/` contain an earlier local-Pandas prototype of
  the same concept, kept for reference/comparison — the live app now
  uses Cube.dev instead.

# MetricMind — Governed Metrics Chat (Agentic BI)

## Domain
Agentic AI & BI Governance

## Problem Statement
Giving an LLM raw access to a dataset to write its own queries often leads
to inconsistent or wrong answers — the model may calculate the same metric
("total sales," "profit margin") differently depending on how a question
is phrased. MetricMind solves this with a governed metrics layer: the LLM
never touches raw data directly. It can only call a fixed set of
pre-defined, tested metric functions — so the answer to "what's total
sales in the South?" is always calculated the same way, no matter who
asks or how.

## Use Case
A user asks MetricMind, *"What's total sales in the South region?"* A
LangChain agent reads the question, decides which governed metric tool to
call (it cannot invent its own calculation), executes it against the
cleaned dataset, and returns a consistent, correct answer.

## Architecture

| Layer | Purpose | Implementation |
|---|---|---|
| Semantic Layer | Single source of truth for every metric | `metrics/metrics.py` — one Python function per metric |
| Agentic Orchestrator | Decides which metric to call from the question | `query_engine/query_engine.py` — real LangChain agent + LLM (OpenAI) |
| Data Layer | Cleaned, structured dataset | `data/load_data.py` + CSV in `data/` |
| Conversational BI Interface | Chat-style front end | `ui/app.py` — Streamlit |

This follows the same governance principle as enterprise semantic-layer
tools (e.g. Cube.dev + LangChain): the LLM orchestrates, but never
calculates numbers itself — it always defers to a governed function.

## Project Structure

```
metricmind-/
├── data/              # Load + clean the dataset (Palmbridge sales data)
├── metrics/           # Governed metric definitions (single source of truth)
├── query_engine/      # LangChain agent — routes questions to metric tools
├── ui/                # Streamlit chat interface
├── tests/             # Unit tests for metrics
├── docs_and_demo/     # Architecture notes + demo script
├── .env               # API key (NOT committed — see .gitignore)
└── requirements.txt
```

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file in the repo root (this file is git-ignored, never
commit it):
```
OPENAI_API_KEY=your_key_here
```

Then run:
```bash
python data/load_data.py     # cleans and exports the dataset
streamlit run ui/app.py      # launches the chat interface
pytest tests/                # runs the test suite
```

## Current Metrics Available

- Total sales by region
- Total sales by category
- Total profit by region
- Average profit margin
- Count of high-value orders (sales >= 10,000)
- Total order count
- **Discounted sales** — total sales value affected by discounts
- **Segment-level metrics** — sales/profit broken down by customer segment
- **Loss-order metric** — count/value of orders sold at a loss

## Example Questions

- "What's total sales in South?"
- "What's total profit in North?"
- "What's the average profit margin?"
- "How many high value orders are there?"
- "What's total discounted sales?"
- "How many orders were sold at a loss?"
- "What's total sales for the Consumer segment?"

## Status / What's Done So Far

- ✅ Data cleaning pipeline (handles inconsistent spacing/casing)
- ✅ Governed metric functions defined in `metrics.py`
- ✅ Real LangChain agent implemented in `query_engine.py` (replaced
  earlier keyword-matching prototype)
- ✅ Streamlit chat UI working end to end
- ✅ **Migrated to the Palmbridge dataset** (replaced the earlier
  Superstore sample) — `load_data.py`, `metrics.py`, and the test suite
  have all been updated to match the new schema
- ✅ Added three new governed metrics: discounted-sales, segment-level,
  and loss-order
- ✅ LangChain tools in `query_engine.py` updated so the agent can route
  questions to the new metrics
- ✅ Unit tests updated and passing against the Palmbridge schema
  (`tests/test_metrics.py`)

## Notes for the Team

- The LLM only ever calls the fixed tools listed in `query_engine.py` —
  it cannot run arbitrary calculations. This is the core "governance"
  concept the whole project demonstrates.
- Never commit your `.env` file or API key. If you need your own key for
  local testing, create your own `.env` — it won't be tracked by git.
- **Pull before you push.** A few merge conflicts came up recently from
  parallel edits to `README.md` and `data/`. If you're editing shared
  files, run `git pull origin main` before you start and again right
  before you push.
- If you're unsure of the exact Palmbridge column names, check
  `data/load_data.py` — it's the source of truth for the schema now.

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
├── data/              # Load + clean the dataset
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

## Example Questions

- "What's total sales in South?"
- "What's total profit in North?"
- "What's the average profit margin?"
- "How many high value orders are there?"

## Status / What's Done So Far

- ✅ Data cleaning pipeline (handles inconsistent spacing/casing)
- ✅ Governed metric functions defined in `metrics.py`
- ✅ Real LangChain agent implemented in `query_engine.py` (replaced
  earlier keyword-matching prototype)
- ✅ Streamlit chat UI working end to end
- ✅ Unit tests passing for all metrics
- 🔄 **In progress today**: swapping in a real Kaggle dataset (Superstore
  Sales) to replace the small sample dataset — column names will change
  slightly (e.g. `Sub-Category`, `Order Date`), so `load_data.py` and
  `metrics.py` will need small updates to match. Whoever does this: please
  post the new dataset's column names in the group chat before editing,
  so we keep everyone's local copy in sync.

## Notes for the Team

- The LLM only ever calls the fixed tools listed in `query_engine.py` —
  it cannot run arbitrary calculations. This is the core "governance"
  concept the whole project demonstrates.
- Never commit your `.env` file or API key. If you need your own key for
  local testing, create your own `.env` — it won't be tracked by git.

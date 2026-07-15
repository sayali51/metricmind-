# MetricMind — Governed Metrics Chat

## Domain

Data Analytics & BI Governance

## Problem Statement

Ad-hoc analysis often produces inconsistent numbers — the same metric
("total sales," "profit margin") gets calculated slightly differently
depending on who runs the query. MetricMind solves this by defining every
business metric **once**, in one place, so any question about that metric
always returns the same, correct answer.

## Use Case

A user asks MetricMind, _"What's total sales in the South region?"_ The
app matches the question to a single governed metric function, runs it
against the cleaned dataset, and returns a consistent answer — no matter
how many times or in how many different phrasings the question is asked.

## Architecture

This project is a practical, buildable implementation of the "semantic
layer" concept used in enterprise BI tools (e.g., Cube.dev, dbt Semantic
Layer): govern each metric's definition centrally, and let a query layer
route natural language questions to it.

| Layer                       | Enterprise equivalent  | Our implementation                                           |
| --------------------------- | ---------------------- | ------------------------------------------------------------ |
| Semantic Layer              | Cube.dev / dbt         | `metrics/metrics.py` — one Python function per metric        |
| Agentic Orchestrator        | LangChain + LLM        | `query_engine/query_engine.py` — question-to-metric matching |
| Data Warehouse              | Snowflake / Databricks | Cleaned CSV loaded via Pandas (`data/`)                      |
| Conversational BI Interface | Next.js + Tremor       | Streamlit chat app (`ui/app.py`)                             |

The governance principle — one definition per metric, always consistent —
is identical to the enterprise version. The infrastructure is scaled down
to something a student project can realistically build, test, and explain
end to end within a month.

## Project Structure

```
metricmind-/
├── data/              # Load + clean the dataset
├── metrics/           # Governed metric definitions
├── query_engine/       # Natural language → metric routing
├── ui/                # Streamlit chat interface
├── tests/             # Unit tests for metrics + query engine
├── docs_and_demo/     # Architecture notes + demo script
└── requirements.txt
```

## Setup

```bash
pip install -r requirements.txt
python data/load_data.py     # cleans and exports the dataset
streamlit run ui/app.py      # launches the chat interface
pytest tests/                # runs the test suite
```

## Example Questions

- "What's total sales in South?"
- "Total sales for Electronics?"
- "What's the average profit margin?"
- "How many high value orders are there?"

## Status

In active development. See `docs_and_demo/ARCHITECTURE.md` for the full
data flow and demo script.

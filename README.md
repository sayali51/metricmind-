cat > README.md << 'EOF'

# MetricMind — Agentic Semantic BI Engine

## Domain

Enterprise Analytics & Agentic AI

## Problem Statement

Giving an LLM raw access to a data warehouse to perform "Text-to-SQL" usually
ends in disaster — hallucinated joins, ignored business logic, and revenue
metrics that differ from official financial reports. MetricMind solves this
by having the LLM orchestrate against a governed Semantic Layer (Cube.dev)
instead of writing raw SQL, so every number is mathematically consistent
with the company's official metric definitions.

## Use Case

An executive asks the MetricMind chat interface, _"Why did our European
margins drop last quarter?"_ Instead of the AI writing SQL against raw
tables, the agent queries a governed Semantic Layer that defines the exact
formula for "margin" and "quarter," then presents a multi-step analytical
explanation using the same numbers Finance already trusts.

## Architecture

- **Semantic Layer** (Cube.dev): central repository where all business
  metrics (Revenue, Margin, Churn) are mathematically defined as code
- **Agentic Orchestrator** (LangChain + Claude API): translates natural
  language into semantic API calls, never raw SQL
- **Data Warehouse** (Postgres locally — Snowflake-compatible design):
  underlying storage serving analytical queries
- **Conversational BI Interface** (Next.js + Tremor/ECharts): chat UI
  rendering natural language alongside interactive charts

## Status

In active development — Day 0 of 30. See `/docs/BUILD_LOG.md` for progress.

## License

MIT
EOF

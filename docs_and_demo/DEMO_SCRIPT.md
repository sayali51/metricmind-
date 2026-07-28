# MetricMind — Demo Script

Use this to run a clean, repeatable demo — for Axlero, your team, or an
interview walkthrough. Total time: ~5 minutes.

## Before you start

1. Start Cube + Postgres:
   ```
   cd cube
   docker-compose up
   ```
2. In a new terminal, confirm data is seeded (only needed once per machine):
   ```
   docker exec -it cube-postgres-1 psql -U cube -d sales -c "SELECT COUNT(*) FROM sales;"
   ```
   Should print `500`. If it's `0` or errors, run `cube/seed.sql` first
   (see README setup section).
3. Start the app:
   ```
   python -m streamlit run ui/app.py
   ```
4. Open `http://localhost:8501` in your browser.

## Part 1 — The problem (30 seconds, spoken)

"If you let an AI write its own SQL against raw sales data, it can
calculate 'total sales' differently depending on how you ask, or
hallucinate a join that doesn't exist. MetricMind fixes this by having
the AI only call pre-defined, governed metrics — it never invents a
calculation."

## Part 2 — Live walkthrough (ask these in order)

| #   | Question to type                         | What it demonstrates                         | Expected result                                                                                  |
| --- | ---------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `What's total sales in South?`           | Basic governed metric, region filter         | A real number, with caption showing `tool_total_sales_by_region`                                 |
| 2   | `What's total profit in North?`          | Different metric, same pattern               | A real number, different tool tag shown                                                          |
| 3   | `What's the overall profit margin?`      | A derived/ratio metric, not just a sum       | A percentage-style number                                                                        |
| 4   | `How many loss-making orders are there?` | Filtered count metric                        | An integer, e.g. a specific loss-order count                                                     |
| 5   | `How's the business doing this year?`    | **Deliberately vague** — shows the guardrail | A clear message that it can't map to a governed metric — proves the AI doesn't guess/hallucinate |

**Key moment to call out on question 5**: this is the actual "governance"
story — a general-purpose chatbot would just make something up here.
MetricMind refuses, because there's no matching governed metric.

## Part 3 — Show the audit trail (30 seconds)

Point at the small caption under any answer (e.g. `🔍 Calculated using
governed metric: tool_total_sales_by_region`). Explain: every number is
traceable to exactly one function, defined once, in `cube/model/cubes/orders.yml`
— so no matter who asks or how, the same question always gets the same
answer.

## Part 4 — Show the architecture (optional, if there's time)

Open `cube/model/cubes/orders.yml` briefly — show that `revenue`, `profit`,
etc. are defined exactly once, in plain YAML. Then open
`query_engine/query_engine.py` — show that the LLM (Groq/Llama) is only
ever given a fixed list of tools to call, never raw database access.

## If something breaks mid-demo

- **Red error about Cube not reachable** → Docker probably isn't running;
  say so plainly ("looks like my local database container isn't up —
  let me restart it") rather than trying to debug live.
- **Empty/zero answers for everything** → data likely isn't seeded on
  this machine; same honesty applies.
- Both are legitimate, explainable infrastructure states — not a flaw
  in the underlying design, and worth saying so if asked.

## Talking points if asked "why not just use raw SQL generation?"

- Raw text-to-SQL can hallucinate table/column names or join logic
  incorrectly, especially as schemas grow.
- A governed metric layer means the _business logic_ (how margin is
  calculated, what counts as "high value") is defined once by someone
  who understands the data, not re-invented by the LLM per question.
- This mirrors how real enterprise BI tools (Looker, dbt Semantic
  Layer, Cube.dev itself) are designed — LLMs are increasingly used as
  the _orchestration_ layer on top of these, not as a replacement for
  them.

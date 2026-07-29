# MetricMind — Demo Script

Use this to run a clean, repeatable demo — for Axlero, your team, or an
interview walkthrough. Total time: ~5 minutes.

## Before you start

Three things need to be running at once, each in its own terminal.

1. Start Cube + Postgres:
   ```
   cd cube
   docker compose up
   ```
2. In a new terminal, confirm data is seeded (only needed once per machine):
   ```
   docker exec -it cube-postgres-1 psql -U cube -d sales -c "SELECT COUNT(*) FROM sales;"
   ```
   Should print `500` (or `501`, depending on the seed run). If it's `0`
   or errors with "relation does not exist", run `cube/seed.sql` first
   (see README setup section).
3. Start the FastAPI backend (in a new terminal, from the project root):
   ```
   python -m uvicorn api.main:app --reload --port 8000
   ```
4. Start the Next.js frontend (in a new terminal):
   ```
   cd web
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

If Next.js reports it's running on `3001` instead of `3000` (because
something else is already using 3000), either free up 3000 or make sure
`api/main.py`'s CORS `allow_origins` list includes whichever port it
actually started on — otherwise the frontend can't reach the backend.

## Part 1 — The problem (30 seconds, spoken)

"If you let an AI write its own SQL against raw sales data, it can
calculate 'total sales' differently depending on how you ask, or
hallucinate a join that doesn't exist. MetricMind fixes this by having
the AI only call pre-defined, governed metrics — it never invents a
calculation."

## Part 2 — Live walkthrough (ask these in order)

| #   | Question to type                         | What it demonstrates                         | Expected result                                                                                  |
| --- | ---------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `What's total sales in South?`           | Basic governed metric, region filter         | A real number, seal icon fills teal, trace shows `tool_total_sales_by_region`                    |
| 2   | `What's total profit in North?`          | Different metric, same pattern               | A real number, different tool tag shown                                                          |
| 3   | `What's the overall profit margin?`      | A derived/ratio metric, not just a sum       | A percentage-style number                                                                        |
| 4   | `How many loss-making orders are there?` | Filtered count metric                        | An integer, e.g. a specific loss-order count                                                     |
| 5   | `How's the business doing this year?`    | **Deliberately vague** — shows the guardrail | A clear message that it can't map to a governed metric — proves the AI doesn't guess/hallucinate |

**Key moment to call out on question 5**: this is the actual "governance"
story — a general-purpose chatbot would just make something up here.
MetricMind refuses, because there's no matching governed metric.

## Part 3 — Show the audit trail (30 seconds)

Click "View query trace" under any answer. Explain: every number is
traceable to exactly one function, defined once, in
`cube/model/cubes/orders.yml` — so no matter who asks or how, the same
question always gets the same answer. The seal icon next to each answer
is a visual shorthand for the same idea — filled and checked means a
governed metric backed the answer, gray means it didn't.

## Part 4 — Show the architecture (optional, if there's time)

Walk through the request path front-to-back:

1. **`web/app/page.tsx`** — the Next.js chat UI. Show that it's a plain
   `fetch()` call to `POST /api/chat`; the frontend has zero business
   logic or metric knowledge of its own.
2. **`api/main.py`** — the FastAPI layer. Show that it's a thin wrapper —
   it just calls `answer_question()` and returns the result as JSON. No
   agent logic lives here; it exists purely to expose the Python agent
   over HTTP so a separate frontend can call it.
3. **`query_engine/query_engine.py`** — the LangChain agent. Show that
   the LLM (Groq/Llama) is only ever given a fixed list of tools to
   call, never raw database access.
4. **`cube/model/cubes/orders.yml`** — show that `revenue`, `profit`,
   etc. are defined exactly once, in plain YAML, which is what the
   tools in step 3 actually query against.

The point to land: swapping Streamlit for Next.js only changed the
delivery mechanism (step 1). Steps 2–4 — the parts that actually make
the numbers trustworthy — didn't change at all.

## If something breaks mid-demo

- **"Couldn't reach the MetricMind API" in the browser** → the FastAPI
  terminal probably isn't running, or crashed; check that terminal for
  a traceback. Say so plainly rather than debugging live.
- **Red error about Cube not reachable** → Docker probably isn't running;
  say so plainly ("looks like my local database container isn't up —
  let me restart it") rather than trying to debug live.
- **Empty/zero answers for everything** → data likely isn't seeded on
  this machine; same honesty applies.
- All three are legitimate, explainable infrastructure states — not a
  flaw in the underlying design, and worth saying so if asked.

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

## Talking points if asked "why Next.js instead of Streamlit?"

- Streamlit is excellent for fast internal prototypes, but it isn't
  meant to be a production-facing app — styling, routing, and
  multi-service integration are all harder to control.
- Splitting into a FastAPI backend + Next.js frontend means the AI
  orchestration layer (Python) and the user-facing app (TypeScript/React)
  can be developed, deployed, and scaled independently — the standard
  pattern for production AI products.
- Nothing about the governance story changed in the move — the same
  agent, same tools, same semantic layer are still doing all the work;
  only the UI layer was rebuilt.
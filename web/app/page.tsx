"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_QUESTIONS = [
  "What's total sales in South?",
  "What's total profit in North?",
  "How many high value orders are there?",
  "How many loss-making orders are there?",
  "What's the overall profit margin?",
  "Why is profit low in the Central region?",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Ask in plain English",
    body: "Type a business question — no SQL, no dashboard filters.",
  },
  {
    step: "02",
    title: "Agent picks a governed tool",
    body: "A LangChain + Groq agent maps your question to one metric tool.",
  },
  {
    step: "03",
    title: "Cube.dev computes it",
    body: "The semantic layer runs it against Postgres from a single shared definition.",
  },
  {
    step: "04",
    title: "You get answer + proof",
    body: "The number comes back with the exact query trace behind it.",
  },
];

const STACK = ["Cube.dev semantic layer", "LangChain + Groq agent", "FastAPI", "Next.js"];

type TraceStep = {
  name: string;
  args: Record<string, unknown>;
  result: string;
};

type ChatResult = {
  answer: string;
  tool_used: boolean;
  trace: TraceStep[];
};

type HistoryItem = {
  question: string;
  result: ChatResult;
};

type ChartPoint = { label: string; value: number };

const NUMERIC_KEY_HINTS = /revenue|profit|sales|value|margin|orders|count/;
const DATE_KEY_HINTS = /date|month|day|year|time/;

// The API returns multi-row answers as "key: value, key2: value2; key: value, ...".
// This is a best-effort parse of that shape into chartable points — if it doesn't
// look like a multi-row breakdown, we just skip the chart and show the plain answer.
function parseChartRows(answer: string): { points: ChartPoint[]; isTrend: boolean } | null {
  if (!answer.includes(";")) return null;

  const rows = answer
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean);
  if (rows.length < 2) return null;

  const points: ChartPoint[] = [];
  let isTrend = false;

  for (const row of rows) {
    const fields = row.split(",").map((f) => f.trim());
    let label: string | null = null;
    let value: number | null = null;

    for (const field of fields) {
      const sepIdx = field.indexOf(":");
      if (sepIdx === -1) continue;
      const key = field.slice(0, sepIdx).trim().toLowerCase();
      const raw = field.slice(sepIdx + 1).trim();
      const cleaned = raw.replace(/[^0-9.-]/g, "");
      const numeric = Number(cleaned);
      const looksNumeric = cleaned.length > 0 && !Number.isNaN(numeric);

      if (looksNumeric && NUMERIC_KEY_HINTS.test(key) && value === null) {
        value = numeric;
      } else if (label === null) {
        label = DATE_KEY_HINTS.test(key) ? raw.slice(0, 7) : raw;
        if (DATE_KEY_HINTS.test(key)) isTrend = true;
      }
    }

    if (label !== null && value !== null && !/^(none|null|undefined)$/i.test(label)) {
      points.push({ label, value });
    }
  }

  return points.length >= 2 ? { points, isTrend } : null;
}

function SealIcon({ verified }: { verified: boolean }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <polygon
        points="17,1 24,4.5 30.5,10 32.5,17 30.5,24 24,29.5 17,33 10,29.5 3.5,24 1.5,17 3.5,10 10,4.5"
        className={verified ? "fill-seal-teal/15 stroke-seal-teal" : "fill-ledger-card stroke-ledger-border"}
        strokeWidth="1"
      />
      {verified ? (
        <path
          d="M11 17.5l4 4 8-8.5"
          stroke="#1D9E75"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : (
        <circle cx="17" cy="17" r="2.2" fill="#5B606C" />
      )}
    </svg>
  );
}

function MetricChart({ points, isTrend }: { points: ChartPoint[]; isTrend: boolean }) {
  return (
    <div className="mt-4 h-48 rounded-lg border border-ledger-hairline bg-ledger-surface p-3">
      <ResponsiveContainer width="100%" height="100%">
        {isTrend ? (
          <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#1F2430" vertical={false} />
            <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
            <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ background: "#181C25", border: "1px solid #262B36", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9A9FAC" }}
              itemStyle={{ color: "#EDECE6" }}
            />
            <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3, fill: "#1D9E75" }} />
          </LineChart>
        ) : (
          <BarChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#1F2430" vertical={false} />
            <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
            <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ background: "#181C25", border: "1px solid #262B36", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9A9FAC" }}
              itemStyle={{ color: "#EDECE6" }}
              cursor={{ fill: "#1D9E75", opacity: 0.08 }}
            />
            <Bar dataKey="value" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Fake trend data in the same "key: value, key2: value2; ..." shape the API
// returns, so you can confirm the chart renders correctly without depending
// on the LLM agent actually picking tool_monthly_sales_trend.
const SAMPLE_TREND_ANSWER =
  "month: 2023-01, revenue: 12500; month: 2023-02, revenue: 14200; " +
  "month: 2023-03, revenue: 9800; month: 2023-04, revenue: 17650; " +
  "month: 2023-05, revenue: 15300; month: 2023-06, revenue: 19200";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTrace, setOpenTrace] = useState<number | null>(null);

  function previewSampleChart() {
    setHistory((prev) => [
      {
        question: "[Preview] Sample monthly trend — not from the live API",
        result: {
          answer: SAMPLE_TREND_ANSWER,
          tool_used: true,
          trace: [
            {
              name: "tool_monthly_sales_trend",
              args: {},
              result: SAMPLE_TREND_ANSWER,
            },
          ],
        },
      },
      ...prev,
    ]);
  }

  async function runQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const data: ChatResult = await res.json();
      setHistory((prev) => [{ question: trimmed, result: data }, ...prev]);
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't reach the MetricMind API: ${err.message}`
          : "Couldn't reach the MetricMind API."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ledger-bg">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SealIcon verified />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal-teal">
              Governed metrics chat · Agentic BI
            </p>
          </div>
          <h1 className="font-display text-4xl font-semibold text-ink-primary mb-3">
            MetricMind
          </h1>
          <p className="text-ink-secondary leading-relaxed max-w-xl">
            Ask a business question in plain English and get back a number that's
            always mathematically consistent — every answer is computed from one
            governed metric definition in Cube.dev, never guessed by the LLM, with
            a full audit trail underneath.
          </p>
        </header>

        {/* How it works */}
        <section className="mb-8 rounded-xl border border-ledger-border bg-ledger-card p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-4">
            How it works
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step}>
                <p className="font-mono text-xs text-seal-teal mb-1.5">{s.step}</p>
                <p className="text-sm font-medium text-ink-primary mb-1">{s.title}</p>
                <p className="text-xs text-ink-secondary leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-ledger-hairline flex flex-wrap gap-2">
            {STACK.map((s) => (
              <span
                key={s}
                className="text-[11px] rounded-full border border-ledger-border bg-ledger-surface px-2.5 py-1 text-ink-muted"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Ask form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuery(question);
          }}
          className="mb-4"
        >
          <label htmlFor="question" className="sr-only">
            Ask a question
          </label>
          <div className="flex gap-3">
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's total profit in North?"
              className="flex-1 rounded-lg bg-ledger-surface border border-ledger-border px-4 py-3 text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-seal-teal/50"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="rounded-lg bg-seal-teal px-5 py-3 font-medium text-ledger-bg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-seal-tealDark transition-colors"
            >
              {loading ? "Running…" : "Run query"}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mb-3">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => runQuery(q)}
              disabled={loading}
              className="text-xs rounded-full border border-ledger-border bg-ledger-surface px-3 py-1.5 text-ink-secondary hover:border-seal-teal/50 hover:text-ink-primary transition-colors disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Dev aid: lets you confirm the chart component renders correctly
            without depending on the backend/agent picking the trend tool.
            Safe to delete once the agent reliably returns trend data. */}
        <div className="mb-10">
          <button
            onClick={previewSampleChart}
            className="text-xs rounded-full border border-dashed border-seal-amber/50 bg-seal-amber/5 px-3 py-1.5 text-seal-amber hover:bg-seal-amber/10 transition-colors"
          >
            ⚡ Preview sample chart (no API call)
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-seal-amber/40 bg-seal-amber/10 px-4 py-3 text-sm text-seal-amber">
            {error}
          </div>
        )}

        {history.length === 0 && !error && (
          <p className="text-sm text-ink-muted italic">
            No questions yet — try one of the suggestions above, or type your own.
          </p>
        )}

        <div className="space-y-4">
          {history.map((item, idx) => {
            const isVerified = item.result.tool_used;
            const traceOpen = openTrace === idx;
            const chart = parseChartRows(item.result.answer);

            return (
              <div
                key={idx}
                className="rounded-xl border border-ledger-border bg-ledger-card p-5"
              >
                <p className="text-sm text-ink-secondary mb-4">{item.question}</p>

                <div className="flex items-start gap-3">
                  <SealIcon verified={isVerified} />
                  <div className="flex-1">
                    {!chart && (
                      <p className="font-mono text-2xl font-medium text-ink-primary">
                        {item.result.answer}
                      </p>
                    )}
                    {chart && (
                      <p className="font-mono text-sm text-ink-primary">
                        Breakdown across {chart.points.length} {chart.isTrend ? "periods" : "categories"}
                      </p>
                    )}
                    <p className="text-xs text-ink-muted mt-1">
                      {item.result.trace.length === 0
                        ? "No governed metric was used for this answer"
                        : item.result.trace.length === 1
                        ? `Calculated using governed metric: ${item.result.trace[0].name}`
                        : `Drilled down using ${item.result.trace.length} governed metrics`}
                    </p>
                  </div>
                </div>

                {chart && <MetricChart points={chart.points} isTrend={chart.isTrend} />}

                {item.result.trace.length > 0 && (
                  <button
                    onClick={() => setOpenTrace(traceOpen ? null : idx)}
                    className="mt-4 text-xs font-mono text-seal-teal hover:text-seal-tealDark transition-colors"
                  >
                    {traceOpen ? "▾ Hide query trace" : "▸ View query trace"}
                  </button>
                )}

                {traceOpen && (
                  <div className="mt-3 space-y-2 border-t border-ledger-hairline pt-3">
                    {item.result.trace.map((step, i) => (
                      <div key={i} className="rounded-md bg-ledger-surface p-3">
                        <p className="font-mono text-xs text-seal-amber mb-1">
                          Step {i + 1}: {step.name}
                        </p>
                        <pre className="font-mono text-xs text-ink-secondary whitespace-pre-wrap break-all">
                          {JSON.stringify({ args: step.args, result: step.result }, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
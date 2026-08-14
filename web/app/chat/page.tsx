"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
type ScatterPoint = { x: number; y: number };

type ChartData =
  | { kind: "trend"; points: ChartPoint[] }
  | { kind: "distribution"; points: ChartPoint[] }
  | { kind: "correlation"; points: ScatterPoint[]; xLabel: string; yLabel: string };

const NUMERIC_KEY_HINTS = /revenue|profit|sales|value|margin|orders|count/;
const DATE_KEY_HINTS = /date|month|day|year|time/;

const PIE_COLORS = ["#1D9E75", "#2FB88F", "#5FCBA8", "#8FD9C1", "#B7E6D8", "#D9A441", "#C97A3D"];

function titleCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

type ParsedField = { key: string; raw: string; cleaned: string; numeric: number; looksNumeric: boolean };

function parseField(field: string): ParsedField | null {
  const sepIdx = field.indexOf(":");
  if (sepIdx === -1) return null;
  const key = field.slice(0, sepIdx).trim().toLowerCase();
  const raw = field.slice(sepIdx + 1).trim();
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const numeric = Number(cleaned);
  const looksNumeric = cleaned.length > 0 && !Number.isNaN(numeric);
  return { key, raw, cleaned, numeric, looksNumeric };
}

// The API returns multi-row answers as "key: value, key2: value2; key: value, ...".
// This is a best-effort parse of that shape into chartable data — if it doesn't
// look like a multi-row breakdown, we just skip the chart and show the plain answer.
//
// Three shapes are recognized:
//  - trend:       a labeled value per date/month -> line chart
//  - distribution: a labeled value per category -> pie chart (or bar, via toggle)
//  - correlation: two numeric fields per row, no label field -> scatter plot
function parseChartData(answer: string): ChartData | null {
  if (!answer.includes(";")) return null;

  const rows = answer
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean);
  if (rows.length < 2) return null;

  // First pass: try to parse every row as a correlation candidate, i.e. exactly
  // two fields, both numeric, neither a date. Only used if ALL rows qualify.
  const scatterPoints: ScatterPoint[] = [];
  let xKey: string | null = null;
  let yKey: string | null = null;
  let allRowsAreCorrelation = true;

  for (const row of rows) {
    const fields = row.split(",").map((f) => f.trim());
    if (fields.length !== 2) {
      allRowsAreCorrelation = false;
      break;
    }
    const parsedFields = fields.map(parseField);
    if (parsedFields.some((f) => f === null)) {
      allRowsAreCorrelation = false;
      break;
    }
    const [f1, f2] = parsedFields as ParsedField[];
    const bothNumeric =
      f1.looksNumeric && f2.looksNumeric && !DATE_KEY_HINTS.test(f1.key) && !DATE_KEY_HINTS.test(f2.key);
    if (!bothNumeric) {
      allRowsAreCorrelation = false;
      break;
    }
    if (xKey === null) xKey = f1.key;
    if (yKey === null) yKey = f2.key;
    scatterPoints.push({ x: f1.numeric, y: f2.numeric });
  }

  if (allRowsAreCorrelation && scatterPoints.length >= 2 && xKey && yKey) {
    return { kind: "correlation", points: scatterPoints, xLabel: titleCase(xKey), yLabel: titleCase(yKey) };
  }

  // Fall back to label/value parsing for trend or distribution charts.
  const points: ChartPoint[] = [];
  let isTrend = false;

  for (const row of rows) {
    const fields = row.split(",").map((f) => f.trim());
    let label: string | null = null;
    let value: number | null = null;

    for (const field of fields) {
      const parsed = parseField(field);
      if (!parsed) continue;
      const { key, raw, looksNumeric, numeric } = parsed;

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

  if (points.length < 2) return null;
  return { kind: isTrend ? "trend" : "distribution", points };
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

const tooltipStyle = {
  contentStyle: { background: "#181C25", border: "1px solid #262B36", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#9A9FAC" },
  itemStyle: { color: "#EDECE6" },
};

function MetricChart({
  data,
  distributionView,
  onToggleDistributionView,
}: {
  data: ChartData;
  distributionView: "bar" | "pie";
  onToggleDistributionView: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-ledger-hairline bg-ledger-surface p-3">
      {data.kind === "distribution" && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-muted">Distribution</span>
          <button
            type="button"
            onClick={onToggleDistributionView}
            className="text-[11px] rounded-full border border-ledger-border px-2.5 py-1 text-ink-secondary hover:border-seal-teal/50 hover:text-ink-primary transition-colors"
          >
            {distributionView === "pie" ? "View as bar" : "View as pie"}
          </button>
        </div>
      )}
      {data.kind === "correlation" && (
        <p className="mb-2 text-[11px] font-mono uppercase tracking-wide text-ink-muted">
          Correlation: {data.xLabel} vs {data.yLabel}
        </p>
      )}

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {data.kind === "trend" ? (
            <LineChart data={data.points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1F2430" vertical={false} />
              <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
              <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3, fill: "#1D9E75" }} />
            </LineChart>
          ) : data.kind === "correlation" ? (
            <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1F2430" />
              <XAxis
                type="number"
                dataKey="x"
                name={data.xLabel}
                stroke="#5B606C"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#262B36" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={data.yLabel}
                stroke="#5B606C"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: "3 3", stroke: "#262B36" }} />
              <Scatter data={data.points} fill="#1D9E75" />
            </ScatterChart>
          ) : distributionView === "pie" ? (
            <PieChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9A9FAC" }} />
              <Pie
                data={data.points}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={64}
                paddingAngle={2}
              >
                {data.points.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data.points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1F2430" vertical={false} />
              <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
              <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "#1D9E75", opacity: 0.08 }} />
              <Bar dataKey="value" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
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

// Fake distribution data (category breakdown, no date field) to preview the pie chart.
const SAMPLE_DISTRIBUTION_ANSWER =
  "region: North, sales: 42000; region: South, sales: 31500; " +
  "region: East, sales: 27800; region: West, sales: 19600; " +
  "region: Central, sales: 15200";

// Fake correlation data (two numeric fields, no label field) to preview the scatter plot.
const SAMPLE_CORRELATION_ANSWER =
  "sales: 12000, profit: 1800; sales: 18500, profit: 3100; " +
  "sales: 9800, profit: 900; sales: 24500, profit: 5200; " +
  "sales: 15300, profit: 2400; sales: 21000, profit: 1200; " +
  "sales: 27800, profit: 6100; sales: 13400, profit: 2000";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTrace, setOpenTrace] = useState<number | null>(null);
  const [distributionViews, setDistributionViews] = useState<Record<number, "bar" | "pie">>({});

  function previewSample(label: string, toolName: string, answer: string) {
    setHistory((prev) => [
      {
        question: `[Preview] ${label} — not from the live API`,
        result: {
          answer,
          tool_used: true,
          trace: [{ name: toolName, args: {}, result: answer }],
        },
      },
      ...prev,
    ]);
  }

  function previewSampleChart() {
    previewSample("Sample monthly trend", "tool_monthly_sales_trend", SAMPLE_TREND_ANSWER);
  }

  function previewSampleDistribution() {
    previewSample("Sample regional distribution", "tool_sales_by_region", SAMPLE_DISTRIBUTION_ANSWER);
  }

  function previewSampleCorrelation() {
    previewSample("Sample sales vs. profit correlation", "tool_sales_profit_pairs", SAMPLE_CORRELATION_ANSWER);
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SealIcon verified />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal-teal">
                Governed metrics chat · Agentic BI
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-mono text-ink-secondary hover:text-seal-teal transition-colors"
            >
              ← Dashboard
            </Link>
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
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            onClick={previewSampleChart}
            className="text-xs rounded-full border border-dashed border-seal-amber/50 bg-seal-amber/5 px-3 py-1.5 text-seal-amber hover:bg-seal-amber/10 transition-colors"
          >
            ⚡ Preview trend (line)
          </button>
          <button
            onClick={previewSampleDistribution}
            className="text-xs rounded-full border border-dashed border-seal-amber/50 bg-seal-amber/5 px-3 py-1.5 text-seal-amber hover:bg-seal-amber/10 transition-colors"
          >
            ⚡ Preview distribution (pie)
          </button>
          <button
            onClick={previewSampleCorrelation}
            className="text-xs rounded-full border border-dashed border-seal-amber/50 bg-seal-amber/5 px-3 py-1.5 text-seal-amber hover:bg-seal-amber/10 transition-colors"
          >
            ⚡ Preview correlation (scatter)
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
            const chart = parseChartData(item.result.answer);
            const distributionView =
              distributionViews[idx] ?? (chart && chart.kind === "distribution" && chart.points.length <= 6 ? "pie" : "bar");

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
                    {chart && chart.kind !== "correlation" && (
                      <p className="font-mono text-sm text-ink-primary">
                        Breakdown across {chart.points.length} {chart.kind === "trend" ? "periods" : "categories"}
                      </p>
                    )}
                    {chart && chart.kind === "correlation" && (
                      <p className="font-mono text-sm text-ink-primary">
                        {chart.points.length} paired data points
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

                {chart && (
                  <MetricChart
                    data={chart}
                    distributionView={distributionView}
                    onToggleDistributionView={() =>
                      setDistributionViews((prev) => ({
                        ...prev,
                        [idx]: distributionView === "pie" ? "bar" : "pie",
                      }))
                    }
                  />
                )}

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
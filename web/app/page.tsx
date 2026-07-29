"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_QUESTIONS = [
  "What's total sales in South?",
  "What's total profit in North?",
  "How many high value orders are there?",
  "How many loss-making orders are there?",
  "What's the overall profit margin?",
  "Why is profit low in the Central region?",
];

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

export default function Home() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTrace, setOpenTrace] = useState<number | null>(null);

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
      <div className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal-teal mb-3">
            Governed metrics chat
          </p>
          <h1 className="font-display text-4xl font-semibold text-ink-primary mb-3">
            MetricMind
          </h1>
          <p className="text-ink-secondary leading-relaxed">
            Ask a business question in plain English. Every number comes from a
            governed metric definition in Cube.dev — never a hallucinated
            calculation — with the full audit trail available below each answer.
          </p>
        </header>

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

        <div className="flex flex-wrap gap-2 mb-10">
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

            return (
              <div
                key={idx}
                className="rounded-xl border border-ledger-border bg-ledger-card p-5"
              >
                <p className="text-sm text-ink-secondary mb-4">{item.question}</p>

                <div className="flex items-start gap-3">
                  <SealIcon verified={isVerified} />
                  <div className="flex-1">
                    <p className="font-mono text-2xl font-medium text-ink-primary">
                      {item.result.answer}
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      {item.result.trace.length === 0
                        ? "No governed metric was used for this answer"
                        : item.result.trace.length === 1
                        ? `Calculated using governed metric: ${item.result.trace[0].name}`
                        : `Drilled down using ${item.result.trace.length} governed metrics`}
                    </p>
                  </div>
                </div>

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

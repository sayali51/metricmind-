"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type ChartPoint = { label: string; value: number };

type Kpis = {
  revenue?: number;
  profit?: number;
  orders?: number;
  high_value_orders?: number;
  loss_orders?: number;
  profit_margin?: number;
};

type DashboardData = {
  kpis: Kpis;
  revenue_by_region: ChartPoint[];
  revenue_by_category: ChartPoint[];
  monthly_revenue_trend: ChartPoint[];
  error: string | null;
};

const tooltipStyle = {
  contentStyle: { background: "#181C25", border: "1px solid #262B36", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#9A9FAC" },
  itemStyle: { color: "#EDECE6" },
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

function formatCurrency(n: number | undefined): string {
  if (n === undefined) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString();
}

function formatPercent(n: number | undefined): string {
  if (n === undefined) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

const KPI_CARDS: { key: keyof Kpis; label: string; format: (n: number | undefined) => string }[] = [
  { key: "revenue", label: "Total Revenue", format: formatCurrency },
  { key: "profit", label: "Total Profit", format: formatCurrency },
  { key: "orders", label: "Total Orders", format: formatNumber },
  { key: "high_value_orders", label: "High-Value Orders", format: formatNumber },
  { key: "profit_margin", label: "Profit Margin", format: formatPercent },
];

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-ledger-border bg-ledger-card p-5 animate-pulse">
      <div className="h-3 w-20 bg-ledger-surface rounded mb-3" />
      <div className="h-7 w-24 bg-ledger-surface rounded" />
    </div>
  );
}

function ChartCardSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-ledger-border bg-ledger-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-4">{title}</p>
      <div className="h-56 rounded-lg bg-ledger-surface animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`${API_URL}/api/dashboard`);
        if (!res.ok) throw new Error(`API responded with ${res.status}`);
        const json: DashboardData = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error
              ? `Couldn't reach the MetricMind API: ${err.message}`
              : "Couldn't reach the MetricMind API."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const backendError = data?.error ?? null;
  const showError = fetchError || backendError;
  const kpis = data?.kpis ?? {};
  const hasKpis = Object.keys(kpis).length > 0;

  return (
    <main className="min-h-screen bg-ledger-bg">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <SealIcon verified />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-seal-teal">
                Governed metrics dashboard · Agentic BI
              </p>
            </div>
            <h1 className="font-display text-4xl font-semibold text-ink-primary mb-3">
              MetricMind
            </h1>
            <p className="text-ink-secondary leading-relaxed max-w-xl">
              A live snapshot of the business, computed straight from the governed
              metric definitions in Cube.dev — the same numbers the chat bot uses.
            </p>
          </div>
        </header>

        {showError && (
          <div className="mb-6 rounded-lg border border-seal-amber/40 bg-seal-amber/10 px-4 py-3 text-sm text-seal-amber">
            ⚠️ {fetchError || backendError}
          </div>
        )}

        {/* KPI cards */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
              : hasKpis
              ? KPI_CARDS.map((card) => (
                  <div key={card.key} className="rounded-xl border border-ledger-border bg-ledger-card p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-2">
                      {card.label}
                    </p>
                    <p className="font-display text-2xl font-semibold text-ink-primary">
                      {card.format(kpis[card.key])}
                    </p>
                  </div>
                ))
              : !showError && (
                  <div className="col-span-full rounded-xl border border-ledger-border bg-ledger-card p-5 text-sm text-ink-muted italic">
                    No KPI data available yet.
                  </div>
                )}
          </div>
        </section>

        {/* Charts: region + category */}
        <section className="mb-6 grid md:grid-cols-2 gap-4">
          {loading ? (
            <>
              <ChartCardSkeleton title="Revenue by Region" />
              <ChartCardSkeleton title="Revenue by Category" />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-ledger-border bg-ledger-card p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                  Revenue by Region
                </p>
                {data && data.revenue_by_region.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenue_by_region} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="#1F2430" vertical={false} />
                        <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
                        <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
                        <Tooltip {...tooltipStyle} cursor={{ fill: "#1D9E75", opacity: 0.08 }} />
                        <Bar dataKey="value" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted italic">No regional data available.</p>
                )}
              </div>

              <div className="rounded-xl border border-ledger-border bg-ledger-card p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                  Revenue by Category
                </p>
                {data && data.revenue_by_category.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenue_by_category} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="#1F2430" vertical={false} />
                        <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
                        <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
                        <Tooltip {...tooltipStyle} cursor={{ fill: "#BA7517", opacity: 0.08 }} />
                        <Bar dataKey="value" fill="#BA7517" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted italic">No category data available.</p>
                )}
              </div>
            </>
          )}
        </section>

        {/* Monthly trend */}
        <section className="mb-8">
          {loading ? (
            <ChartCardSkeleton title="Monthly Revenue Trend" />
          ) : (
            <div className="rounded-xl border border-ledger-border bg-ledger-card p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                Monthly Revenue Trend
              </p>
              {data && data.monthly_revenue_trend.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly_revenue_trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#1F2430" vertical={false} />
                      <XAxis dataKey="label" stroke="#5B606C" fontSize={10} tickLine={false} axisLine={{ stroke: "#262B36" }} />
                      <YAxis stroke="#5B606C" fontSize={10} tickLine={false} axisLine={false} width={44} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3, fill: "#1D9E75" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-ink-muted italic">No time-series data available yet.</p>
              )}
            </div>
          )}
        </section>

        {/* Bottom CTA into the chat bot */}
        <section className="rounded-xl border border-dashed border-seal-teal/40 bg-seal-teal/5 p-6 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="font-display text-lg font-semibold text-ink-primary mb-1">
              Have a specific question?
            </p>
            <p className="text-sm text-ink-secondary max-w-md">
              Ask MetricMind in plain English — every answer is computed from a
              governed metric, with a full query trace behind it.
            </p>
          </div>
          <Link
            href="/chat"
            className="shrink-0 rounded-lg bg-seal-teal px-5 py-3 font-medium text-ledger-bg hover:bg-seal-tealDark transition-colors"
          >
            Open the chat bot →
          </Link>
        </section>
      </div>
    </main>
  );
}
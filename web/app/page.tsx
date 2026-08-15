"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Sidebar, Topbar, type AnchorItem } from "./components/Shell";

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

const PALETTE = ["#1D9E75", "#BA7517", "#5B8DEF", "#B968E0", "#E0577B", "#3FB6C9"];

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

function IconTrend(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path d="M3 17l6-6 4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" fill="currentColor" />
      <circle cx="12" cy="9" r="2.5" fill="#181C25" />
    </svg>
  );
}

function IconTag(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path d="M3 12.5 12.5 3H19a2 2 0 0 1 2 2v6.5L11.5 21 3 12.5Z" fill="currentColor" />
      <circle cx="16" cy="8" r="1.6" fill="#181C25" />
    </svg>
  );
}

const ANCHOR_ITEMS: AnchorItem[] = [
  { label: "Revenue trend", href: "#trend", icon: IconTrend },
  { label: "Regional split", href: "#regional", icon: IconPin },
  { label: "Categories", href: "#categories", icon: IconTag },
];

/* ------------------------------- Skeletons ------------------------------- */

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-ledger-border bg-ledger-card p-5 animate-pulse ${className}`}>
      <div className="h-3 w-24 bg-ledger-surface rounded mb-3" />
      <div className="h-7 w-28 bg-ledger-surface rounded mb-4" />
      <div className="h-40 rounded-xl bg-ledger-surface" />
    </div>
  );
}

function StatCardSkeleton() {
  return <div className="rounded-2xl bg-ledger-card border border-ledger-border p-5 h-[104px] animate-pulse" />;
}

/* --------------------------------- Page --------------------------------- */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const categoryTotal = useMemo(
    () => (data?.revenue_by_category ?? []).reduce((sum, p) => sum + p.value, 0),
    [data]
  );
  const regionMax = useMemo(
    () => Math.max(1, ...(data?.revenue_by_region ?? []).map((p) => p.value)),
    [data]
  );

  const statCards = [
    { label: "Total Revenue", value: formatCurrency(kpis.revenue) },
    { label: "Total Profit", value: formatCurrency(kpis.profit) },
    { label: "Total Orders", value: formatNumber(kpis.orders) },
    { label: "Profit Margin", value: formatPercent(kpis.profit_margin) },
  ];

  return (
    <div className="min-h-screen bg-ledger-bg flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} anchorItems={ANCHOR_ITEMS} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar eyebrow="Agentic BI" title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 px-5 py-6 max-w-6xl w-full mx-auto">
          {showError && (
            <div className="mb-5 rounded-xl border border-seal-amber/40 bg-seal-amber/10 px-4 py-3 text-sm text-seal-amber">
              ⚠️ {fetchError || backendError}
            </div>
          )}

          {/* Hero row: trend + category mix */}
          <section id="trend" className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mb-4">
            {loading ? (
              <CardSkeleton />
            ) : (
              <div className="rounded-2xl border border-ledger-border bg-ledger-card p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">
                      Revenue overview
                    </p>
                    <p className="font-display text-3xl font-semibold text-ink-primary">
                      {formatCurrency(kpis.revenue)}
                    </p>
                    <p className="text-sm text-ink-secondary mt-1">
                      {formatNumber(kpis.orders)} orders across the period
                    </p>
                  </div>
                  <span className="rounded-full bg-seal-teal/10 px-3 py-1 text-xs font-medium text-seal-teal">
                    Monthly
                  </span>
                </div>

                {data && data.monthly_revenue_trend.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.monthly_revenue_trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1F2430" vertical={false} />
                        <XAxis dataKey="label" stroke="#5B606C" fontSize={11} tickLine={false} axisLine={{ stroke: "#262B36" }} />
                        <YAxis stroke="#5B606C" fontSize={11} tickLine={false} axisLine={false} width={44} />
                        <Tooltip
                          contentStyle={{ background: "#181C25", border: "1px solid #262B36", borderRadius: 10, fontSize: 12 }}
                          labelStyle={{ color: "#9A9FAC" }}
                          itemStyle={{ color: "#EDECE6" }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2.5} fill="url(#trendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted italic">No time-series data available yet.</p>
                )}
              </div>
            )}

            {loading ? (
              <CardSkeleton />
            ) : (
              <div id="categories" className="rounded-2xl border border-ledger-border bg-ledger-card p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                  Revenue mix by category
                </p>
                {data && data.revenue_by_category.length > 0 ? (
                  <>
                    <div className="h-40 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.revenue_by_category}
                            dataKey="value"
                            nameKey="label"
                            innerRadius="65%"
                            outerRadius="100%"
                            paddingAngle={3}
                            stroke="none"
                          >
                            {data.revenue_by_category.map((_, i) => (
                              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="font-display text-lg font-semibold text-ink-primary">
                          {formatCurrency(categoryTotal)}
                        </p>
                        <p className="text-[11px] text-ink-muted">total</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {data.revenue_by_category.map((p, i) => (
                        <div key={p.label} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-ink-secondary">
                            <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                            {p.label}
                          </span>
                          <span className="font-medium text-ink-primary">
                            {categoryTotal > 0 ? `${((p.value / categoryTotal) * 100).toFixed(0)}%` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink-muted italic">No category data available.</p>
                )}
              </div>
            )}
          </section>

          {/* Stat cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              : statCards.map((card, i) => (
                  <div key={card.label} className="rounded-2xl border border-ledger-border bg-ledger-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">{card.label}</p>
                      <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <p className="font-display text-2xl font-semibold text-ink-primary">{card.value}</p>
                  </div>
                ))}
          </section>

          {/* Regional + category detail */}
          <section className="grid md:grid-cols-2 gap-4">
            {loading ? (
              <CardSkeleton />
            ) : (
              <div id="regional" className="rounded-2xl border border-ledger-border bg-ledger-card p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                  Revenue by region
                </p>
                {data && data.revenue_by_region.length > 0 ? (
                  <div className="space-y-4">
                    {data.revenue_by_region.map((p, i) => (
                      <div key={p.label}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-ink-primary font-medium">{p.label}</span>
                          <span className="text-ink-secondary">{formatCurrency(p.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ledger-surface overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(p.value / regionMax) * 100}%`, background: PALETTE[i % PALETTE.length] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted italic">No regional data available.</p>
                )}
              </div>
            )}

            {loading ? (
              <CardSkeleton />
            ) : (
              <div className="rounded-2xl border border-ledger-border bg-ledger-card p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-4">
                  Category breakdown
                </p>
                {data && data.revenue_by_category.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted">
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                        <th className="pb-2 font-medium text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.revenue_by_category.map((p, i) => (
                        <tr key={p.label} className="border-t border-ledger-hairline">
                          <td className="py-2.5 text-ink-primary flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                            {p.label}
                          </td>
                          <td className="py-2.5 text-right text-ink-secondary">{formatCurrency(p.value)}</td>
                          <td className="py-2.5 text-right text-ink-primary font-medium">
                            {categoryTotal > 0 ? `${((p.value / categoryTotal) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-ink-muted italic">No category data available.</p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function IconGrid(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function IconChat(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconMenu(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSpark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className}>
      <path
        d="M4 15l3-8 3 8M5.5 12h3M14 15l2-6 2 6M14.5 12h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: IconGrid },
  { label: "Ask MetricMind", href: "/chat", icon: IconChat },
];

export type AnchorItem = { label: string; href: string; icon: (props: { className?: string }) => JSX.Element };

export function Sidebar({
  open,
  onClose,
  anchorItems = [],
}: {
  open: boolean;
  onClose: () => void;
  anchorItems?: AnchorItem[];
}) {
  const pathname = usePathname();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed z-40 md:z-0 md:static top-0 left-0 h-screen w-64 shrink-0 border-r border-ledger-border bg-ledger-card flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5">
          <div className="flex items-center gap-2.5 rounded-xl bg-ledger-surface border border-ledger-border px-3.5 py-2.5">
            <div className="h-7 w-7 rounded-lg bg-seal-teal/15 flex items-center justify-center">
              <IconSpark className="h-4 w-4 text-seal-teal" />
            </div>
            <span className="font-display text-base font-semibold text-ink-primary tracking-tight">
              MetricMind
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-seal-teal/10 text-seal-teal"
                    : "text-ink-secondary hover:bg-ledger-surface hover:text-ink-primary"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}

          {anchorItems.length > 0 && (
            <>
              <p className="px-3 pt-5 pb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
                On this page
              </p>
              {anchorItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary hover:bg-ledger-surface hover:text-ink-primary transition-colors"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </a>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4">
          <div className="rounded-xl border border-dashed border-seal-teal/30 bg-seal-teal/5 p-3.5">
            <p className="text-xs font-medium text-ink-primary mb-1">Governed by Cube.dev</p>
            <p className="text-[11px] leading-relaxed text-ink-secondary">
              Every number here shares one metric definition with the chat bot.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

/* --------------------------------- Topbar --------------------------------- */
/* No CTA buttons here on purpose — the sidebar's "Ask MetricMind" link is the
   single entry point into chat, so this stays a plain page-title bar. */

export function Topbar({
  eyebrow,
  title,
  onMenuClick,
}: {
  eyebrow: string;
  title: string;
  onMenuClick: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-ledger-border bg-ledger-card/80 backdrop-blur px-5 py-3.5">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-secondary hover:bg-ledger-surface md:hidden"
          aria-label="Toggle menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-seal-teal">{eyebrow}</p>
          <h1 className="font-display text-lg font-semibold text-ink-primary leading-tight">{title}</h1>
        </div>
      </div>
    </div>
  );
}
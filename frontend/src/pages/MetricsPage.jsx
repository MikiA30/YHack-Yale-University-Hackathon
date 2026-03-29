import { useState, useEffect, useCallback } from "react";
import ChatPanel from "../components/ChatPanel";
import ReportModal from "../components/ReportModal";
import AuraLogo from "../components/AuraLogo";

// ── small helpers ─────────────────────────────────────────────────────────────
const fmt$ = (n) => `$${Number(n).toFixed(2)}`;
const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

const colorMap = {
  emerald: { value: "text-emerald-600", strip: "bg-emerald-500" },
  violet: { value: "text-gray-900", strip: "bg-gray-900" },
  red: { value: "text-red-600", strip: "bg-red-500" },
  amber: { value: "text-amber-600", strip: "bg-amber-400" },
  sky: { value: "text-sky-600", strip: "bg-sky-500" },
};

function StatCard({ label, value, sub, color = "violet" }) {
  const c = colorMap[color] ?? colorMap.violet;
  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <div className={`h-0.5 w-full ${c.strip}`} />
      <div className="p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p
          className={`text-2xl font-bold mt-1 tabular-nums tracking-tight ${c.value}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
        {title}
      </h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [financials, setFinancials] = useState(null);
  const [losses, setLosses] = useState(null);
  const [eod, setEod] = useState(null);
  const [eodOpen, setEodOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eodLoading, setEodLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportScrollTo, setReportScrollTo] = useState(null);

  const openReport = (scrollTo = null) => {
    setReportScrollTo(scrollTo);
    setReportOpen(true);
  };

  const load = useCallback(() => {
    Promise.all([
      fetch("/financials").then((r) => r.json()),
      fetch("/stockout_losses").then((r) => r.json()),
    ])
      .then(([fin, loss]) => {
        setFinancials(fin);
        setLosses(loss);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // refresh every 10 s so sold items appear quickly
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const loadEod = () => {
    setEodLoading(true);
    fetch("/eod_summary")
      .then((r) => r.json())
      .then((data) => {
        setEod(data);
        setEodOpen(true);
        setEodLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading metrics…</p>
      </div>
    );
  }

  const noSales = !financials?.by_product?.length;

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <AuraLogo size={28} />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900 tracking-tight">
                A.U.R.A. Metrics
              </span>
              <span className="hidden sm:block text-xs text-gray-400 font-normal">
                Financial Tracking
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/"
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100/70 transition-all duration-150"
            >
              ← Dashboard
            </a>
            <a
              href="/employee"
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-gray-900 hover:bg-black text-white transition-all duration-150 active:scale-[0.97]"
            >
              Employee Mode
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 bg-gray-50 min-h-screen">
        {/* ── top stat cards ── */}
        <section>
          <SectionHeader
            title="Today's Performance"
            sub={`Date: ${financials?.date ?? "—"}`}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={fmt$(financials?.total_revenue ?? 0)}
              sub="sales recorded today"
              color="emerald"
              icon={<span className="text-white text-lg font-bold">$</span>}
            />
            <StatCard
              label="Total Profit"
              value={fmt$(financials?.total_profit ?? 0)}
              sub={`${fmtPct(financials?.margin_pct ?? 0)} margin`}
              color="violet"
              icon={<span className="text-white text-sm font-bold">↑</span>}
            />
            <StatCard
              label="Projected Lost Revenue"
              value={fmt$(losses?.total_lost_revenue ?? 0)}
              sub="from stockout risk items"
              color="red"
              icon={<span className="text-white text-sm font-bold">!</span>}
            />
            <StatCard
              label="Projected Lost Profit"
              value={fmt$(losses?.total_lost_profit ?? 0)}
              sub="profit at risk this week"
              color="amber"
              icon={<span className="text-white text-sm font-bold">↓</span>}
            />
          </div>
        </section>

        {/* ── stockout loss table ── */}
        <section>
          <SectionHeader
            title="Stockout Risk — Projected Losses"
            sub="Items where predicted demand exceeds current stock"
          />
          {!losses?.losses?.length ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
              <p className="text-emerald-700 font-semibold">
                No stockout risk detected ✓
              </p>
              <p className="text-xs text-emerald-500 mt-1">
                All items have sufficient stock to meet predicted demand
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      In Stock
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Predicted
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Shortfall
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Lost Revenue
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Lost Profit
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {losses.losses.map((l, i) => (
                    <tr
                      key={l.item}
                      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {l.item}
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                        {l.current_stock}
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                        {l.predicted_demand}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-semibold text-red-600 tabular-nums">
                          −{l.shortfall}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-red-600 tabular-nums">
                        {fmt$(l.lost_revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-amber-600 tabular-nums">
                        {fmt$(l.lost_profit)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">
                        {fmtPct(l.margin_pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td
                      colSpan={4}
                      className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      Total at risk
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 tabular-nums">
                      {fmt$(losses.total_lost_revenue)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-amber-600 tabular-nums">
                      {fmt$(losses.total_lost_profit)}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── today's sales breakdown ── */}
        <section>
          <SectionHeader
            title="Today's Sales Breakdown"
            sub="Revenue and profit per product sold today"
          />
          {noSales ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                No sales recorded yet today
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Sales appear here automatically when items are sold via the
                employee page
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Units Sold
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {financials.by_product.map((p, i) => (
                    <tr
                      key={p.item}
                      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {p.item}
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                        {p.units_sold}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 tabular-nums">
                        {fmt$(p.revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                        {fmt$(p.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-500 tabular-nums">
                        {fmtPct(p.margin_pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                      {financials.by_product.reduce(
                        (s, p) => s + p.units_sold,
                        0,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 tabular-nums">
                      {fmt$(financials.total_revenue)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {fmt$(financials.total_profit)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-500 tabular-nums">
                      {fmtPct(financials.margin_pct)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── end-of-day summary ── */}
        <section>
          <SectionHeader
            title="End-of-Day Summary"
            sub="Full business snapshot with restock recommendations for tomorrow"
          />
          <button
            onClick={loadEod}
            disabled={eodLoading}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50 flex items-center gap-2 active:scale-[0.97] shadow-sm"
          >
            {eodLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Generating…
              </>
            ) : (
              "Generate End-of-Day Report"
            )}
          </button>

          {eodOpen && eod && (
            <div className="mt-4 space-y-6">
              {/* headline stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Day Revenue"
                  value={fmt$(eod.total_revenue)}
                  color="emerald"
                />
                <StatCard
                  label="Day Profit"
                  value={fmt$(eod.total_profit)}
                  sub={`${fmtPct(eod.margin_pct)} margin`}
                  color="violet"
                />
                <StatCard
                  label="Revenue at Risk"
                  value={fmt$(eod.total_projected_lost_revenue)}
                  color="red"
                />
                <StatCard
                  label="Profit at Risk"
                  value={fmt$(eod.total_projected_lost_profit)}
                  color="amber"
                />
              </div>

              {/* highlights row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Best Seller Today
                  </p>
                  {eod.best_seller ? (
                    <>
                      <p className="font-semibold text-gray-900">
                        {eod.best_seller.item}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {fmt$(eod.best_seller.revenue)} revenue ·{" "}
                        {eod.best_seller.units_sold} units
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No sales yet</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Highest Margin Item
                  </p>
                  {eod.highest_margin_item ? (
                    <>
                      <p className="font-semibold text-gray-900">
                        {eod.highest_margin_item.item}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {fmtPct(eod.highest_margin_item.margin_pct)} margin per
                        unit
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">N/A</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Biggest Stockout Risk
                  </p>
                  {eod.biggest_stockout_risk ? (
                    <>
                      <p className="font-semibold text-gray-900">
                        {eod.biggest_stockout_risk.item}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {fmt$(eod.biggest_stockout_risk.lost_revenue)} at risk ·{" "}
                        {eod.biggest_stockout_risk.shortfall} unit shortfall
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-600 font-medium">
                      No risk detected ✓
                    </p>
                  )}
                </div>
              </div>

              {/* restock actions */}
              {eod.restock_actions?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Restock Actions for Tomorrow
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sorted by priority — critical items first
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          In Stock
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Order Qty
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Rev Gain
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Profit Gain
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {eod.restock_actions.map((a, i) => (
                        <tr
                          key={a.item}
                          className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                        >
                          <td className="px-5 py-3.5 font-semibold text-gray-900">
                            {a.item}
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                            {a.current_stock}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                            +{a.restock_qty}
                          </td>
                          <td className="px-4 py-3.5 text-right text-emerald-600 tabular-nums">
                            {fmt$(a.revenue_gain)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-700 tabular-nums">
                            {fmt$(a.profit_gain)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                a.priority === "critical"
                                  ? "bg-red-50 border border-red-200 text-red-700"
                                  : "bg-amber-50 border border-amber-200 text-amber-700"
                              }`}
                            >
                              {a.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── A.U.R.A. export suggestion ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                <div className="shrink-0 mt-0.5">
                  <AuraLogo size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    A.U.R.A. Recommendation
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Your end-of-day summary has been compiled.
                    {eod.restock_actions?.length > 0 && (
                      <>
                        {" "}
                        I've flagged{" "}
                        <span className="text-gray-900 font-semibold">
                          {eod.restock_actions.length} item
                          {eod.restock_actions.length !== 1 ? "s" : ""}
                        </span>{" "}
                        requiring attention before tomorrow's open.
                      </>
                    )}
                    {eod.total_projected_lost_revenue > 0 && (
                      <>
                        {" "}
                        There is{" "}
                        <span className="text-red-600 font-semibold">
                          {fmt$(eod.total_projected_lost_revenue)}
                        </span>{" "}
                        in projected revenue at risk from current stockout
                        exposure.
                      </>
                    )}{" "}
                    Would you like a comprehensive business report with demand
                    forecasts, profitability charts, and detailed restock
                    projections?
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => openReport(null)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition-all duration-150 active:scale-[0.97]"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                        />
                      </svg>
                      Export as PDF
                    </button>
                    <button
                      onClick={() => openReport(null)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition-all duration-150 active:scale-[0.97]"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                        />
                      </svg>
                      Export as Excel
                    </button>
                    <button
                      onClick={() => openReport(null)}
                      className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-150 active:scale-[0.97]"
                    >
                      View Full Report
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEodOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150 font-medium"
              >
                Collapse report ↑
              </button>
            </div>
          )}
        </section>
      </main>

      <ChatPanel onOpenReport={openReport} />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        scrollTo={reportScrollTo}
      />
    </div>
  );
}

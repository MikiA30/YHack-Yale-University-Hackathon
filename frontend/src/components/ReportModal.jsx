import { useState, useEffect, useRef } from "react";
import AuraLogo from "./AuraLogo";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const fmtPct = (n) => `${Number(n ?? 0).toFixed(1)}%`;
const abbrev = (name) => {
  const words = name.split(" ");
  if (words.length <= 2) return name;
  return words.slice(0, 2).join(" ");
};

const CHART_THEME = {
  cartesian: "#334155",
  tick: { fill: "#94a3b8", fontSize: 11 },
  tooltip: {
    contentStyle: {
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#e2e8f0",
      fontSize: 12,
    },
    cursor: { fill: "rgba(99,102,241,0.08)" },
  },
};

const recBadge = {
  "Buy More": "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  "Buy Less": "bg-red-500/10 border-red-500/30 text-red-400",
  Hold: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

function StatCard({ label, value, sub, valueColor = "text-white" }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-lg font-semibold text-slate-200 mb-4 pt-2">
      {children}
    </h2>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function exportPDF(report) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const violet = [99, 102, 241];
    const red = [239, 68, 68];
    const headStyles = { fillColor: violet, textColor: 255, fontStyle: "bold" };
    const altRow = { fillColor: [245, 247, 250] };
    const date = report.generated_at;

    const sectionTitle = (text, y) => {
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, "bold");
      doc.text(text, 14, y);
      doc.setFont(undefined, "normal");
    };

    // ── Page 1: Summary ──────────────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, "bold");
    doc.text("A.U.R.A. Business Report", 14, 22);
    doc.setFont(undefined, "normal");

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${report.store.name}  ·  ${report.store.location}`, 14, 30);
    doc.text(`Generated: ${date}`, 14, 36);

    autoTable(doc, {
      startY: 44,
      head: [["Metric", "Value"]],
      body: [
        ["Today Revenue", fmt$(report.summary.today_revenue)],
        ["Today Profit", fmt$(report.summary.today_profit)],
        ["Profit Margin", fmtPct(report.summary.today_margin_pct)],
        ["Projected Lost Revenue", fmt$(report.summary.projected_lost_revenue)],
        ["Projected Lost Profit", fmt$(report.summary.projected_lost_profit)],
        ["Active Alerts", String(report.summary.total_alerts)],
        ["Total Products", String(report.summary.total_items)],
      ],
      headStyles,
      alternateRowStyles: altRow,
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    // ── Page 2: Demand Forecast table ────────────────────────────────────────
    doc.addPage();
    sectionTitle("Demand Forecast", 18);

    autoTable(doc, {
      startY: 24,
      head: [["Item", "In Stock", "Predicted", "Change %", "Recommendation"]],
      body: report.forecast.map((f) => [
        f.item,
        f.current_stock,
        f.predicted_demand,
        `${f.demand_change_pct > 0 ? "+" : ""}${f.demand_change_pct}%`,
        f.recommendation,
      ]),
      headStyles,
      alternateRowStyles: altRow,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    // ── Page 3: Revenue & Profit table ───────────────────────────────────────
    doc.addPage();
    sectionTitle("Projected Weekly Revenue & Profit", 18);

    autoTable(doc, {
      startY: 24,
      head: [
        ["Item", "Sell Price", "Unit Cost", "Proj. Revenue", "Proj. Profit"],
      ],
      body: report.revenue_data.map((r) => [
        r.item,
        fmt$(r.price),
        fmt$(r.unit_cost),
        fmt$(r.projected_weekly_revenue),
        fmt$(r.projected_weekly_profit),
      ]),
      headStyles,
      alternateRowStyles: altRow,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.addPage();
    sectionTitle("Stockout Risks", 18);

    autoTable(doc, {
      head: [
        [
          "Item",
          "In Stock",
          "Predicted",
          "Shortfall",
          "Lost Revenue",
          "Lost Profit",
        ],
      ],
      startY: 24,
      body: report.stockout_risks.length
        ? report.stockout_risks.map((s) => [
            s.item,
            s.current_stock,
            s.predicted_demand,
            s.shortfall,
            fmt$(s.lost_revenue),
            fmt$(s.lost_profit),
          ])
        : [["No stockout risks detected", "", "", "", "", ""]],
      headStyles: { fillColor: red, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: altRow,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // ── Page 4: Recommendations ───────────────────────────────────────────────
    doc.addPage();
    sectionTitle("Action Recommendations", 18);

    autoTable(doc, {
      startY: 24,
      head: [["Item", "Action", "Demand Change", "In Stock", "Predicted"]],
      body: report.recommendations.length
        ? report.recommendations.map((r) => [
            r.item,
            r.action,
            `${r.demand_change_pct > 0 ? "+" : ""}${r.demand_change_pct}%`,
            r.current_stock,
            r.predicted_demand,
          ])
        : [["All items on Hold — no action needed", "", "", "", ""]],
      headStyles,
      alternateRowStyles: altRow,
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`AURA_Report_${date}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
    alert(`PDF export failed: ${err.message}`);
  }
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
function setColWidths(ws, widths) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

function addSheet(wb, name, headers, rows, colWidths) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  setColWidths(ws, colWidths);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ── Excel export ──────────────────────────────────────────────────────────────
function exportExcel(report) {
  try {
    const wb = XLSX.utils.book_new();
    const date = report.generated_at;

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summaryData = [
      ["A.U.R.A. BUSINESS REPORT", "", ""],
      [`Store: ${report.store.name}`, report.store.location, ""],
      [`Generated: ${date}`, "", ""],
      ["", "", ""],
      ["METRIC", "VALUE", ""],
      ["Today Revenue", fmt$(report.summary.today_revenue), ""],
      ["Today Profit", fmt$(report.summary.today_profit), ""],
      ["Profit Margin", fmtPct(report.summary.today_margin_pct), ""],
      [
        "Projected Lost Revenue",
        fmt$(report.summary.projected_lost_revenue),
        "",
      ],
      ["Projected Lost Profit", fmt$(report.summary.projected_lost_profit), ""],
      ["Active Alerts", report.summary.total_alerts, ""],
      ["Total Products Tracked", report.summary.total_items, ""],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    setColWidths(wsSummary, [32, 22, 16]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // ── Sheet 2: Demand Forecast ──────────────────────────────────────────────
    addSheet(
      wb,
      "Demand Forecast",
      [
        "Item",
        "Current Stock",
        "Predicted Demand",
        "Change %",
        "Recommendation",
      ],
      report.forecast.map((f) => [
        f.item,
        f.current_stock,
        f.predicted_demand,
        `${f.demand_change_pct > 0 ? "+" : ""}${f.demand_change_pct}%`,
        f.recommendation,
      ]),
      [32, 14, 16, 12, 16],
    );

    // ── Sheet 3: Revenue & Profit ─────────────────────────────────────────────
    addSheet(
      wb,
      "Revenue & Profit",
      [
        "Item",
        "Sell Price",
        "Unit Cost",
        "Proj. Weekly Revenue",
        "Proj. Weekly Profit",
        "Margin %",
      ],
      report.revenue_data.map((r) => {
        const margin =
          r.price > 0
            ? fmtPct(((r.price - r.unit_cost) / r.price) * 100)
            : "0.0%";
        return [
          r.item,
          fmt$(r.price),
          fmt$(r.unit_cost),
          fmt$(r.projected_weekly_revenue),
          fmt$(r.projected_weekly_profit),
          margin,
        ];
      }),
      [32, 12, 12, 22, 22, 10],
    );

    // ── Sheet 4: Stockout Risks ───────────────────────────────────────────────
    addSheet(
      wb,
      "Stockout Risks",
      [
        "Item",
        "In Stock",
        "Predicted",
        "Shortfall",
        "Lost Revenue",
        "Lost Profit",
        "Margin %",
      ],
      report.stockout_risks.length
        ? report.stockout_risks.map((s) => [
            s.item,
            s.current_stock,
            s.predicted_demand,
            s.shortfall,
            fmt$(s.lost_revenue),
            fmt$(s.lost_profit),
            fmtPct(s.margin_pct),
          ])
        : [["No stockout risks detected", "", "", "", "", "", ""]],
      [32, 10, 12, 12, 14, 14, 10],
    );

    // ── Sheet 5: Recommendations ──────────────────────────────────────────────
    addSheet(
      wb,
      "Recommendations",
      [
        "Item",
        "Action",
        "Demand Change %",
        "Current Stock",
        "Predicted Demand",
      ],
      report.recommendations.length
        ? report.recommendations.map((r) => [
            r.item,
            r.action,
            `${r.demand_change_pct > 0 ? "+" : ""}${r.demand_change_pct}%`,
            r.current_stock,
            r.predicted_demand,
          ])
        : [["All items on Hold — no action needed", "", "", "", ""]],
      [32, 12, 16, 14, 16],
    );

    XLSX.writeFile(wb, `AURA_Report_${date}.xlsx`);
  } catch (err) {
    console.error("Excel export failed:", err);
    alert(`Excel export failed: ${err.message}`);
  }
}

// ── main component ────────────────────────────────────────────────────────────
export default function ReportModal({ open, onClose, scrollTo }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const forecastRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    if (scrollTo === "forecast" && report) {
      setTimeout(
        () => forecastRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
      return;
    }

    if (report) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      fetch("/report")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load report");
          return r.json();
        })
        .then((data) => {
          if (cancelled) return;
          setReport(data);
          setLoading(false);
          if (scrollTo === "forecast") {
            setTimeout(
              () => forecastRef.current?.scrollIntoView({ behavior: "smooth" }),
              150,
            );
          }
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e.message);
          setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, scrollTo, report]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center py-8 px-4">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-5xl">
          {/* ── modal header ── */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700/50 rounded-t-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AuraLogo size={32} />
              <div>
                <h1 className="text-lg font-bold text-white">
                  Business Report
                </h1>
                {report && (
                  <p className="text-xs text-slate-400">
                    {report.store.name} · {report.store.location} ·{" "}
                    {report.generated_at}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report && (
                <>
                  <button
                    onClick={() => exportPDF(report)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
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
                    PDF
                  </button>
                  <button
                    onClick={() => exportExcel(report)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
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
                    Excel
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="ml-1 text-slate-400 hover:text-white text-xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>
          </div>

          {/* ── body ── */}
          <div className="px-6 py-6 space-y-10">
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="text-center space-y-3">
                  <svg
                    className="w-8 h-8 animate-spin text-violet-500 mx-auto"
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
                  <p className="text-slate-400 text-sm">Generating report…</p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {report && (
              <>
                {/* ── 1. Executive Summary ── */}
                <section>
                  <SectionTitle>Executive Summary</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard
                      label="Today Revenue"
                      value={fmt$(report.summary.today_revenue)}
                      valueColor="text-emerald-400"
                    />
                    <StatCard
                      label="Today Profit"
                      value={fmt$(report.summary.today_profit)}
                      valueColor="text-violet-400"
                    />
                    <StatCard
                      label="Margin"
                      value={fmtPct(report.summary.today_margin_pct)}
                      valueColor="text-sky-400"
                    />
                    <StatCard
                      label="Lost Revenue Risk"
                      value={fmt$(report.summary.projected_lost_revenue)}
                      valueColor="text-red-400"
                    />
                    <StatCard
                      label="Lost Profit Risk"
                      value={fmt$(report.summary.projected_lost_profit)}
                      valueColor="text-amber-400"
                    />
                    <StatCard
                      label="Active Alerts"
                      value={report.summary.total_alerts}
                      valueColor={
                        report.summary.total_alerts > 0
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    />
                  </div>
                </section>

                {/* ── 2. Demand Forecast Chart ── */}
                <section ref={forecastRef}>
                  <SectionTitle>
                    Demand Forecast — Current Stock vs Predicted
                  </SectionTitle>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={report.forecast.map((f) => ({
                          ...f,
                          name: abbrev(f.item),
                        }))}
                        margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_THEME.cartesian}
                        />
                        <XAxis
                          dataKey="name"
                          tick={CHART_THEME.tick}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={CHART_THEME.tick} />
                        <Tooltip {...CHART_THEME.tooltip} />
                        <Legend
                          wrapperStyle={{
                            color: "#94a3b8",
                            fontSize: 12,
                            paddingTop: 16,
                          }}
                        />
                        <Bar
                          dataKey="current_stock"
                          name="Current Stock"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="predicted_demand"
                          name="Predicted Demand"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* ── 3. Revenue & Profit Chart ── */}
                <section>
                  <SectionTitle>
                    Projected Weekly Revenue & Profit (Top Items)
                  </SectionTitle>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={report.revenue_data
                          .slice(0, 6)
                          .map((r) => ({ ...r, name: abbrev(r.item) }))}
                        margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_THEME.cartesian}
                        />
                        <XAxis
                          dataKey="name"
                          tick={CHART_THEME.tick}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={CHART_THEME.tick}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          {...CHART_THEME.tooltip}
                          formatter={(v) => `$${Number(v).toFixed(2)}`}
                        />
                        <Legend
                          wrapperStyle={{
                            color: "#94a3b8",
                            fontSize: 12,
                            paddingTop: 16,
                          }}
                        />
                        <Bar
                          dataKey="projected_weekly_revenue"
                          name="Proj. Revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="projected_weekly_profit"
                          name="Proj. Profit"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* ── 4. Top Sellers ── */}
                <section>
                  <SectionTitle>Top Sellers by Projected Revenue</SectionTitle>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-left px-5 py-3 text-xs text-slate-400 font-medium">
                            Product
                          </th>
                          <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                            Price
                          </th>
                          <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                            Proj. Revenue
                          </th>
                          <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">
                            Proj. Profit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_sellers.map((s, i) => (
                          <tr
                            key={s.item}
                            className={`border-b border-slate-700/30 ${i % 2 ? "bg-slate-700/10" : ""}`}
                          >
                            <td className="px-5 py-3 text-white font-medium">
                              {s.item}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {fmt$(s.price)}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                              {fmt$(s.projected_weekly_revenue)}
                            </td>
                            <td className="px-5 py-3 text-right text-violet-400 font-medium">
                              {fmt$(s.projected_weekly_profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ── 5. Stockout Risks ── */}
                <section>
                  <SectionTitle>Stockout Risks</SectionTitle>
                  {report.stockout_risks.length === 0 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
                      <p className="text-emerald-400 font-medium">
                        No stockout risk — all items have sufficient stock ✓
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left px-5 py-3 text-xs text-slate-400 font-medium">
                              Product
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              In Stock
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              Predicted
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              Shortfall
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              Lost Revenue
                            </th>
                            <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">
                              Lost Profit
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.stockout_risks.map((s, i) => (
                            <tr
                              key={s.item}
                              className={`border-b border-slate-700/30 ${i % 2 ? "bg-slate-700/10" : ""}`}
                            >
                              <td className="px-5 py-3 text-white font-medium">
                                {s.item}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">
                                {s.current_stock}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">
                                {s.predicted_demand}
                              </td>
                              <td className="px-4 py-3 text-right text-red-400 font-medium">
                                -{s.shortfall}
                              </td>
                              <td className="px-4 py-3 text-right text-red-400 font-medium">
                                {fmt$(s.lost_revenue)}
                              </td>
                              <td className="px-5 py-3 text-right text-amber-400">
                                {fmt$(s.lost_profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* ── 6. Recommendations ── */}
                <section>
                  <SectionTitle>Action Recommendations</SectionTitle>
                  {report.recommendations.length === 0 ? (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 text-center">
                      <p className="text-slate-400">
                        All items are on Hold — no immediate action needed.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left px-5 py-3 text-xs text-slate-400 font-medium">
                              Product
                            </th>
                            <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">
                              Action
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              Demand Change
                            </th>
                            <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">
                              In Stock
                            </th>
                            <th className="text-right px-5 py-3 text-xs text-slate-400 font-medium">
                              Predicted
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.recommendations.map((r, i) => (
                            <tr
                              key={r.item}
                              className={`border-b border-slate-700/30 ${i % 2 ? "bg-slate-700/10" : ""}`}
                            >
                              <td className="px-5 py-3 text-white font-medium">
                                {r.item}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${recBadge[r.action] ?? recBadge["Hold"]}`}
                                >
                                  {r.action}
                                </span>
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-medium ${r.demand_change_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}
                              >
                                {r.demand_change_pct > 0 ? "+" : ""}
                                {r.demand_change_pct}%
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">
                                {r.current_stock}
                              </td>
                              <td className="px-5 py-3 text-right text-slate-300">
                                {r.predicted_demand}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* ── 7. Live Market Signals ── */}
                {Object.keys(report.live_signals ?? {}).length > 0 && (
                  <section>
                    <SectionTitle>Live Market Signals</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {report.live_signals.weather && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                          <p className="text-xs text-sky-400 font-medium mb-1">
                            🌤 Weather Forecast
                          </p>
                          <p className="text-sm text-slate-300">
                            {report.live_signals.weather}
                          </p>
                        </div>
                      )}
                      {report.live_signals.economic && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                          <p className="text-xs text-amber-400 font-medium mb-1">
                            📈 Economic Signal
                          </p>
                          <p className="text-sm text-slate-300">
                            {report.live_signals.economic}
                          </p>
                        </div>
                      )}
                      {report.live_signals.events && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                          <p className="text-xs text-violet-400 font-medium mb-1">
                            📰 News Events
                          </p>
                          <p className="text-sm text-slate-300">
                            {report.live_signals.events}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

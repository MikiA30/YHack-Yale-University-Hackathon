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
  cartesian: "#E5E7EB",
  tick: { fill: "#9CA3AF", fontSize: 11 },
  tooltip: {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: "1px solid #E5E7EB",
      borderRadius: "8px",
      color: "#111827",
      fontSize: 12,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
    },
    cursor: { fill: "rgba(0,0,0,0.03)" },
  },
};

const recBadge = {
  "Buy More": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Buy Less": "bg-red-50 text-red-700 border border-red-200",
  Hold: "bg-gray-100 text-gray-500 border border-gray-200",
};

function StatCard({ label, value, sub, valueColor = "text-gray-900" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-xl font-bold mt-0.5 tabular-nums ${valueColor}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 pt-2">
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
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-5xl shadow-2xl">
          {/* ── modal header ── */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 rounded-t-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AuraLogo size={32} />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Business Report
                </h1>
                {report && (
                  <p className="text-xs text-gray-400">
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
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium transition-all duration-150 active:scale-[0.97]"
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
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-all duration-150 active:scale-[0.97]"
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
                className="ml-1 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>

          {/* ── body ── */}
          <div className="px-6 py-6 space-y-10 bg-gray-50/30">
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
                  <p className="text-gray-400 text-sm">Generating report…</p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-red-600 font-medium">{error}</p>
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
                      valueColor="text-emerald-600"
                    />
                    <StatCard
                      label="Today Profit"
                      value={fmt$(report.summary.today_profit)}
                      valueColor="text-gray-900"
                    />
                    <StatCard
                      label="Margin"
                      value={fmtPct(report.summary.today_margin_pct)}
                      valueColor="text-sky-600"
                    />
                    <StatCard
                      label="Lost Revenue Risk"
                      value={fmt$(report.summary.projected_lost_revenue)}
                      valueColor="text-red-600"
                    />
                    <StatCard
                      label="Lost Profit Risk"
                      value={fmt$(report.summary.projected_lost_profit)}
                      valueColor="text-amber-600"
                    />
                    <StatCard
                      label="Active Alerts"
                      value={report.summary.total_alerts}
                      valueColor={
                        report.summary.total_alerts > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    />
                  </div>
                </section>

                {/* ── 2. Demand Forecast Chart ── */}
                <section ref={forecastRef}>
                  <SectionTitle>
                    Demand Forecast — Current Stock vs Predicted
                  </SectionTitle>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
                            color: "#6B7280",
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
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
                            color: "#6B7280",
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
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* ── 4. Top Sellers ── */}
                <section>
                  <SectionTitle>Top Sellers by Projected Revenue</SectionTitle>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Proj. Revenue
                          </th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Proj. Profit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_sellers.map((s, i) => (
                          <tr
                            key={s.item}
                            className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 ? "bg-gray-50/30" : "bg-white"}`}
                          >
                            <td className="px-5 py-3.5 font-semibold text-gray-900">
                              {s.item}
                            </td>
                            <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                              {fmt$(s.price)}
                            </td>
                            <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold tabular-nums">
                              {fmt$(s.projected_weekly_revenue)}
                            </td>
                            <td className="px-5 py-3.5 text-right text-gray-700 font-semibold tabular-nums">
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
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center">
                      <p className="text-emerald-700 font-semibold">
                        No stockout risk — all items have sufficient stock ✓
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
                          </tr>
                        </thead>
                        <tbody>
                          {report.stockout_risks.map((s, i) => (
                            <tr
                              key={s.item}
                              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 ? "bg-gray-50/30" : "bg-white"}`}
                            >
                              <td className="px-5 py-3.5 font-semibold text-gray-900">
                                {s.item}
                              </td>
                              <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                                {s.current_stock}
                              </td>
                              <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                                {s.predicted_demand}
                              </td>
                              <td className="px-4 py-3.5 text-right text-red-600 font-semibold tabular-nums">
                                −{s.shortfall}
                              </td>
                              <td className="px-4 py-3.5 text-right text-red-600 font-semibold tabular-nums">
                                {fmt$(s.lost_revenue)}
                              </td>
                              <td className="px-5 py-3.5 text-right text-amber-600 tabular-nums">
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
                    <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
                      <p className="text-gray-500">
                        All items are on Hold — no immediate action needed.
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
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Action
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Demand Change
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              In Stock
                            </th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Predicted
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.recommendations.map((r, i) => (
                            <tr
                              key={r.item}
                              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 ${i % 2 ? "bg-gray-50/30" : "bg-white"}`}
                            >
                              <td className="px-5 py-3.5 font-semibold text-gray-900">
                                {r.item}
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${recBadge[r.action] ?? recBadge["Hold"]}`}
                                >
                                  {r.action}
                                </span>
                              </td>
                              <td
                                className={`px-4 py-3.5 text-right font-semibold tabular-nums ${r.demand_change_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}
                              >
                                {r.demand_change_pct > 0 ? "+" : ""}
                                {r.demand_change_pct}%
                              </td>
                              <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                                {r.current_stock}
                              </td>
                              <td className="px-5 py-3.5 text-right text-gray-600 tabular-nums">
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
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-sky-600 mb-1.5">
                            🌤 Weather Forecast
                          </p>
                          <p className="text-sm text-gray-600">
                            {report.live_signals.weather}
                          </p>
                        </div>
                      )}
                      {report.live_signals.economic && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-amber-600 mb-1.5">
                            📈 Economic Signal
                          </p>
                          <p className="text-sm text-gray-600">
                            {report.live_signals.economic}
                          </p>
                        </div>
                      )}
                      {report.live_signals.events && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-indigo-600 mb-1.5">
                            📰 News Events
                          </p>
                          <p className="text-sm text-gray-600">
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

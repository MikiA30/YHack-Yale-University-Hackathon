import { useState } from "react";
import api from "../api";

const riskColor = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-red-600",
  critical: "text-red-700",
  none: "text-gray-400",
};

const riskBg = {
  low: "bg-emerald-50 border-emerald-100",
  medium: "bg-amber-50 border-amber-100",
  high: "bg-red-50 border-red-100",
  critical: "bg-red-50 border-red-200",
  none: "bg-gray-50 border-gray-100",
};

export default function SimulatorModal({ item, onClose, onRefresh }) {
  const [qty, setQty] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = () => {
    setLoading(true);
    api("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: item.item, restock_qty: qty }),
    })
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      });
  };

  const applyRestock = () => {
    api("/update_inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: item.item, action: "restock", amount: qty }),
    }).then(() => {
      onRefresh();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg mx-4 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              What-If Simulator
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{item.item}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-150 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Current Stock
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {item.current_stock}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Predicted Demand
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {item.predicted_demand}
              </p>
            </div>
          </div>

          {/* Qty input + simulate */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                Restock Quantity
              </label>
              <input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all duration-150"
              />
            </div>
            <div className="pt-5">
              <button
                onClick={runSimulation}
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-black text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.97] whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
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
                    Running…
                  </span>
                ) : (
                  "Simulate"
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4 pt-1">
              <div className="h-px bg-gray-100" />

              {/* Risk cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "New Stock", value: result.new_stock, plain: true },
                  {
                    label: "Stockout Risk",
                    value: result.stockout_risk,
                    risk: result.stockout_risk,
                  },
                  {
                    label: "Waste Risk",
                    value: result.waste_risk,
                    risk: result.waste_risk,
                  },
                ].map(({ label, value, risk, plain }) => (
                  <div
                    key={label}
                    className={`rounded-xl border p-3 text-center ${
                      plain
                        ? "bg-gray-50 border-gray-100"
                        : (riskBg[risk] ?? riskBg.none)
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-400 mb-1">
                      {label}
                    </p>
                    <p
                      className={`text-base font-bold capitalize tabular-nums ${
                        plain
                          ? "text-gray-900"
                          : (riskColor[risk] ?? "text-gray-500")
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Revenue cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-emerald-600 mb-1">
                    Revenue Gain
                  </p>
                  <p className="text-lg font-bold text-emerald-700 tabular-nums">
                    +${result.revenue_gain.toFixed(2)}
                  </p>
                  {result.profit_gain != null && (
                    <p className="text-xs text-emerald-500 mt-0.5">
                      +${result.profit_gain.toFixed(2)} profit
                    </p>
                  )}
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-red-600 mb-1">
                    Lost Revenue
                  </p>
                  <p className="text-lg font-bold text-red-700 tabular-nums">
                    −${result.lost_revenue.toFixed(2)}
                  </p>
                  {result.lost_profit != null && (
                    <p className="text-xs text-red-400 mt-0.5">
                      −${result.lost_profit.toFixed(2)} profit
                    </p>
                  )}
                </div>
              </div>

              {result.surplus > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠ {result.surplus} units may go unsold at this restock level.
                </p>
              )}

              {/* Apply button */}
              <button
                onClick={applyRestock}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-gray-900 hover:bg-black text-white transition-all duration-150 active:scale-[0.98]"
              >
                Apply Restock (+{qty} units)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

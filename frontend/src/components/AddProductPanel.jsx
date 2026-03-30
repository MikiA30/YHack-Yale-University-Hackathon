import { useState } from "react";
import api from "../api";

const CATEGORIES = [
  "beverages",
  "energy_drinks",
  "snacks",
  "hot_beverages",
  "frozen",
  "accessories",
  "produce",
  "general",
];

export default function AddProductPanel({ onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    current_stock: "",
    base_weekly_demand: "",
    unit_cost: "",
    price: "",
    reorder_threshold: "10",
    category: "general",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = () => {
    setBusy(true);
    setResult(null);
    api("/add_product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        current_stock: parseInt(form.current_stock),
        base_weekly_demand: parseInt(form.base_weekly_demand),
        unit_cost: parseFloat(form.unit_cost),
        price: parseFloat(form.price),
        reorder_threshold: parseInt(form.reorder_threshold),
        category: form.category,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setBusy(false);
        onRefresh();
      })
      .catch(() => setBusy(false));
  };

  const valid =
    form.name &&
    form.current_stock &&
    form.base_weekly_demand &&
    form.unit_cost &&
    form.price;

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-all duration-150";

  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Product
      </button>
    );
  }

  return (
    <section>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add New Product</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              A.U.R.A. will generate demand factors automatically
            </p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setResult(null);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-150 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name (full width) */}
          <div>
            <label className={labelCls}>Product Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Celsius Tropical Vibe"
              className={inputCls}
            />
          </div>

          {/* 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Starting Stock</label>
              <input
                type="number"
                value={form.current_stock}
                onChange={(e) => set("current_stock", e.target.value)}
                placeholder="50"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Weekly Demand (est.)</label>
              <input
                type="number"
                value={form.base_weekly_demand}
                onChange={(e) => set("base_weekly_demand", e.target.value)}
                placeholder="30"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.unit_cost}
                onChange={(e) => set("unit_cost", e.target.value)}
                placeholder="0.50"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Sell Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="1.29"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reorder Threshold</label>
              <input
                type="number"
                value={form.reorder_threshold}
                onChange={(e) => set("reorder_threshold", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-black text-white transition-all duration-150 disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
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
                A.U.R.A. is profiling…
              </>
            ) : (
              "Add Product"
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  "{result.item}" added to inventory
                </p>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    result.factor_source === "lava"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {result.factor_source === "lava"
                    ? "AI-powered"
                    : "Default factors"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  [
                    "Weather",
                    `${(result.factors.weather_factor * 100).toFixed(0)}%`,
                  ],
                  [
                    "Traffic",
                    `${(result.factors.traffic_factor * 100).toFixed(0)}%`,
                  ],
                  [
                    "Gas Price",
                    `${(result.factors.gas_price_factor * 100).toFixed(0)}%`,
                  ],
                  [
                    "Trend",
                    `${(result.factors.trend_factor * 100).toFixed(0)}%`,
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded-lg"
                  >
                    <span className="text-xs text-gray-500">{k}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              {result.reasoning && (
                <p className="text-xs text-gray-500 italic leading-relaxed">
                  {result.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

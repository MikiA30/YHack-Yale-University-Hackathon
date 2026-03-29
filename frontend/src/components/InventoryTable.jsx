import { useState } from "react";

const recBadge = {
  "Buy More": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Buy Less": "bg-red-50 text-red-700 border border-red-200",
  Hold: "bg-gray-100 text-gray-500 border border-gray-200",
};

function QuickActions({ item, onRefresh }) {
  const [busy, setBusy] = useState(false);

  const update = (action, amount) => {
    setBusy(true);
    fetch("/update_inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: item.item, action, amount }),
    })
      .then(() => onRefresh())
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={busy}
        onClick={() => update("sold", 1)}
        className="px-2 py-1 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium transition-all duration-150 disabled:opacity-40 active:scale-[0.96]"
      >
        −1
      </button>
      <button
        disabled={busy}
        onClick={() => update("sold", 5)}
        className="px-2 py-1 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium transition-all duration-150 disabled:opacity-40 active:scale-[0.96]"
      >
        −5
      </button>
      <button
        disabled={busy}
        onClick={() => update("restock", 10)}
        className="px-2 py-1 text-xs rounded-md border border-gray-900 bg-gray-900 hover:bg-black text-white font-medium transition-all duration-150 disabled:opacity-40 active:scale-[0.96]"
      >
        +10
      </button>
    </div>
  );
}

export default function InventoryTable({ inventory, onSimulate, onRefresh }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Inventory Overview
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Aisle
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Predicted
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Δ Units
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Signal
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Quick
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {inventory.map((row, i) => (
                <tr
                  key={row.item}
                  className={`
                    border-b border-gray-100 last:border-0
                    hover:bg-gray-50/60 transition-colors duration-100
                    ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                  `}
                >
                  {/* Item name */}
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-gray-900">
                      {row.item}
                    </span>
                  </td>

                  {/* Aisle */}
                  <td className="px-4 py-3.5">
                    {row.aisle && (
                      <span
                        title={row.aisle_name}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                      >
                        {row.aisle}
                      </span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        row.current_stock <= row.reorder_threshold
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {row.current_stock}
                    </span>
                  </td>

                  {/* Predicted */}
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-600">
                    {row.predicted_demand}
                  </td>

                  {/* Delta */}
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        row.recommended_change > 0
                          ? "text-emerald-600"
                          : row.recommended_change < 0
                            ? "text-red-600"
                            : "text-gray-400"
                      }`}
                    >
                      {row.recommended_change > 0 ? "+" : ""}
                      {row.recommended_change}
                    </span>
                  </td>

                  {/* Recommendation badge */}
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recBadge[row.recommendation]}`}
                    >
                      {row.recommendation}
                    </span>
                  </td>

                  {/* Quick actions */}
                  <td className="px-4 py-3.5">
                    <QuickActions item={row} onRefresh={onRefresh} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => onSimulate(row)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all duration-150 active:scale-[0.97] whitespace-nowrap"
                      >
                        What-If
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${row.item} from inventory?`)) {
                            fetch("/remove_product", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: row.item }),
                            }).then(() => onRefresh());
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-150 active:scale-[0.97]"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react'

const recBadge = {
  'Buy More': 'bg-emerald-400/10 text-emerald-400',
  'Buy Less': 'bg-red-400/10 text-red-400',
  'Hold': 'bg-amber-400/10 text-amber-400',
}

function QuickActions({ item, onRefresh }) {
  const [busy, setBusy] = useState(false)

  const update = (action, amount) => {
    setBusy(true)
    fetch('/update_inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: item.item, action, amount }),
    })
      .then(() => onRefresh())
      .finally(() => setBusy(false))
  }

  return (
    <div className="flex gap-1.5">
      <button
        disabled={busy}
        onClick={() => update('sold', 1)}
        className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40"
      >
        -1
      </button>
      <button
        disabled={busy}
        onClick={() => update('sold', 5)}
        className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40"
      >
        -5
      </button>
      <button
        disabled={busy}
        onClick={() => update('restock', 10)}
        className="px-2 py-1 text-xs rounded bg-violet-600/80 hover:bg-violet-500 text-white disabled:opacity-40"
      >
        +10
      </button>
    </div>
  )
}

export default function InventoryTable({ inventory, onSimulate, onRefresh }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Inventory Overview</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 text-left">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Aisle</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Predicted</th>
              <th className="px-5 py-3 font-medium">Change</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Quick</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row, i) => (
              <tr
                key={row.item}
                className={`border-t border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}`}
              >
                <td className="px-5 py-3 text-white font-medium">{row.item}</td>
                <td className="px-5 py-3">
                  {row.aisle && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300" title={row.aisle_name}>
                      {row.aisle}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-300">{row.current_stock}</td>
                <td className="px-5 py-3 text-slate-300">{row.predicted_demand}</td>
                <td className="px-5 py-3">
                  <span className={row.recommended_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {row.recommended_change > 0 ? '+' : ''}{row.recommended_change}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${recBadge[row.recommendation]}`}>
                    {row.recommendation}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <QuickActions item={row} onRefresh={onRefresh} />
                </td>
                <td className="px-5 py-3 flex gap-1.5">
                  <button
                    onClick={() => onSimulate(row)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white transition-colors"
                  >
                    What-If
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${row.item} from inventory?`)) {
                        fetch('/remove_product', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: row.item }),
                        }).then(() => onRefresh())
                      }
                    }}
                    className="text-xs px-2 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/60 text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

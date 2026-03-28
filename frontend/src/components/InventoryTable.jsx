const recBadge = {
  'Buy More': 'bg-emerald-400/10 text-emerald-400',
  'Buy Less': 'bg-red-400/10 text-red-400',
  'Hold': 'bg-amber-400/10 text-amber-400',
}

export default function InventoryTable({ inventory }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Inventory Overview</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 text-left">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Predicted Demand</th>
              <th className="px-5 py-3 font-medium">Change</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((row, i) => (
              <tr
                key={row.item}
                className={`border-t border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}`}
              >
                <td className="px-5 py-3 text-white font-medium">{row.item}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

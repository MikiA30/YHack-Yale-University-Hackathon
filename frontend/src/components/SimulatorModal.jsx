import { useState } from 'react'

const riskColor = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
  critical: 'text-red-500',
  none: 'text-slate-400',
}

export default function SimulatorModal({ item, onClose, onRefresh }) {
  const [qty, setQty] = useState(10)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = () => {
    setLoading(true)
    fetch('/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: item.item, restock_qty: qty }),
    })
      .then(r => r.json())
      .then(data => {
        setResult(data)
        setLoading(false)
      })
  }

  const applyRestock = () => {
    fetch('/update_inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: item.item, action: 'restock', amount: qty }),
    }).then(() => {
      onRefresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">What-If Simulator — {item.item}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-slate-400">Current Stock</p>
            <p className="text-xl font-bold text-white">{item.current_stock}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-slate-400">Predicted Demand</p>
            <p className="text-xl font-bold text-white">{item.predicted_demand}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">Restock Quantity:</label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Simulating...' : 'Simulate'}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">New Stock</p>
                <p className="text-lg font-bold text-white">{result.new_stock}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Stockout Risk</p>
                <p className={`text-lg font-bold capitalize ${riskColor[result.stockout_risk]}`}>
                  {result.stockout_risk}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Waste Risk</p>
                <p className={`text-lg font-bold capitalize ${riskColor[result.waste_risk]}`}>
                  {result.waste_risk}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                <p className="text-emerald-400 text-xs">Revenue Gain</p>
                <p className="text-lg font-bold text-emerald-400">+${result.revenue_gain.toFixed(2)}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <p className="text-red-400 text-xs">Lost Revenue</p>
                <p className="text-lg font-bold text-red-400">-${result.lost_revenue.toFixed(2)}</p>
              </div>
            </div>

            {result.surplus > 0 && (
              <p className="text-xs text-amber-400">
                {result.surplus} units may go unsold (surplus)
              </p>
            )}

            <button
              onClick={applyRestock}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Apply Restock (+{qty})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

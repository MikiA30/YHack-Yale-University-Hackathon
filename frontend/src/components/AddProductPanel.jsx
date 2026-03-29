import { useState } from 'react'

const CATEGORIES = [
  'beverages', 'energy_drinks', 'snacks', 'hot_beverages',
  'frozen', 'accessories', 'produce', 'general',
]

export default function AddProductPanel({ onRefresh }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', current_stock: '', base_weekly_demand: '',
    unit_cost: '', price: '', reorder_threshold: '10', category: 'general',
  })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const submit = () => {
    setBusy(true)
    setResult(null)
    fetch('/add_product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      .then(r => r.json())
      .then(data => {
        setResult(data)
        setBusy(false)
        onRefresh()
      })
      .catch(() => setBusy(false))
  }

  const valid = form.name && form.current_stock && form.base_weekly_demand && form.unit_cost && form.price

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
      >
        + Add Product
      </button>
    )
  }

  return (
    <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Add New Product</h2>
        <button onClick={() => { setOpen(false); setResult(null) }} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-400">Product Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Bananas"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Starting Stock</label>
          <input type="number" value={form.current_stock} onChange={e => set('current_stock', e.target.value)} placeholder="50"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Weekly Demand (est.)</label>
          <input type="number" value={form.base_weekly_demand} onChange={e => set('base_weekly_demand', e.target.value)} placeholder="30"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Unit Cost ($)</label>
          <input type="number" step="0.01" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="0.50"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Sell Price ($)</label>
          <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="1.29"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Reorder Threshold</label>
          <input type="number" value={form.reorder_threshold} onChange={e => set('reorder_threshold', e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!valid || busy}
        className="w-full py-2.5 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
      >
        {busy ? 'AI is profiling...' : 'Add Product'}
      </button>

      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm space-y-2">
          <p className="text-emerald-400 font-medium">
            Added "{result.item}" to inventory
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${result.factor_source === 'lava' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-600/50 text-slate-400'}`}>
              {result.factor_source === 'lava' ? 'AI-powered' : 'Default factors'}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <p>Weather: {(result.factors.weather_factor * 100).toFixed(0)}%</p>
            <p>Traffic: {(result.factors.traffic_factor * 100).toFixed(0)}%</p>
            <p>Gas Price: {(result.factors.gas_price_factor * 100).toFixed(0)}%</p>
            <p>Trend: {(result.factors.trend_factor * 100).toFixed(0)}%</p>
          </div>
          {result.reasoning && (
            <p className="text-xs text-slate-400 italic">{result.reasoning}</p>
          )}
        </div>
      )}
    </section>
  )
}

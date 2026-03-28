const recColor = {
  'Buy More': 'text-emerald-400',
  'Buy Less': 'text-red-400',
  'Hold': 'text-amber-400',
}

const recBg = {
  'Buy More': 'bg-emerald-400/10 border-emerald-400/30',
  'Buy Less': 'bg-red-400/10 border-red-400/30',
  'Hold': 'bg-amber-400/10 border-amber-400/30',
}

export default function PredictionCards({ predictions }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Demand Predictions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {predictions.map(p => (
          <div key={p.item} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">{p.item}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${recBg[p.recommendation]}`}>
                <span className={recColor[p.recommendation]}>{p.recommendation}</span>
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className={`text-3xl font-bold ${p.demand_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {p.demand_change_pct > 0 ? '+' : ''}{p.demand_change_pct}%
              </span>
              <span className="text-slate-400 text-sm mb-1">demand</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${p.probability}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{p.probability}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

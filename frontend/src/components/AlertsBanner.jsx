const levelStyle = {
  critical: 'bg-red-500/10 border-red-500/40 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
}

const levelIcon = {
  critical: '!!',
  warning: '!',
  info: 'i',
}

export default function AlertsBanner({ alerts }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-200 mb-3">Low Stock Alerts</h2>
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${levelStyle[a.level]}`}>
          <span className="text-xs font-bold w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0">
            {levelIcon[a.level]}
          </span>
          <span className="text-sm">{a.message}</span>
        </div>
      ))}
    </section>
  )
}

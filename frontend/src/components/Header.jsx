export default function Header() {
  return (
    <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              A.U.R.A.
            </h1>
            <p className="text-xs text-slate-400">
              Adaptive Uncertainty & Risk Agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:block">
            Gas Station Inventory Intelligence
          </span>
          <a
            href="/metrics"
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Metrics
          </a>
          <a
            href="/employee"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            Employee Mode
          </a>
        </div>
      </div>
    </header>
  );
}

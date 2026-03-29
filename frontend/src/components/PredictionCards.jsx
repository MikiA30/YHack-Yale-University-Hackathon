const recBadge = {
  "Buy More": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Buy Less": "bg-red-50 text-red-700 border border-red-200",
  Hold: "bg-gray-100 text-gray-500 border border-gray-200",
};

const recStrip = {
  "Buy More": "bg-emerald-500",
  "Buy Less": "bg-red-500",
  Hold: "bg-gray-300",
};

export default function PredictionCards({ predictions }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Demand Predictions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {predictions.map((p) => (
          <div
            key={p.item}
            className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-default"
          >
            {/* colored top strip */}
            <div className={`h-0.5 w-full ${recStrip[p.recommendation]}`} />

            <div className="p-5 space-y-3">
              {/* header row */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                  {p.item}
                </h3>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${recBadge[p.recommendation]}`}
                >
                  {p.recommendation}
                </span>
              </div>

              {/* demand change */}
              <div className="flex items-end gap-1.5">
                <span
                  className={`text-3xl font-bold tracking-tight ${
                    p.demand_change_pct >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {p.demand_change_pct > 0 ? "+" : ""}
                  {p.demand_change_pct}%
                </span>
                <span className="text-gray-400 text-sm mb-0.5">demand</span>
              </div>

              {/* confidence bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <span className="text-xs font-medium text-gray-600">
                    {p.probability}%
                  </span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full transition-all duration-500"
                    style={{ width: `${p.probability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

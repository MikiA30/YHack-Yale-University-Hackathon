const SOURCE_LABELS = {
  geocoding: "Location",
  weather: "Weather",
  soil: "Soil",
  market: "Market",
  ag_context: "Ag Context",
};

const SOURCE_STYLES = {
  live: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  fallback: "border-amber-300/20 bg-amber-300/10 text-amber-50",
  failed: "border-slate-200/15 bg-white/10 text-slate-100",
};

function DataQualityBadgeRow({ dataSources, compact = false }) {
  if (!dataSources) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      {Object.entries(SOURCE_LABELS).map(([key, label]) => {
        const status = dataSources[key];
        return (
          <span
            key={key}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${SOURCE_STYLES[status]}`}
            title={`${label}: ${status}`}
          >
            {label}: {status}
          </span>
        );
      })}
    </div>
  );
}

export default DataQualityBadgeRow;

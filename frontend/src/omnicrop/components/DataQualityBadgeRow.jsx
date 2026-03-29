const SOURCE_LABELS = {
  geocoding: "Location",
  weather: "Weather",
  soil: "Soil",
  market: "Market",
  ag_context: "Ag Context",
};

const SOURCE_STYLES = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  fallback: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-gray-200 bg-gray-100 text-gray-600",
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

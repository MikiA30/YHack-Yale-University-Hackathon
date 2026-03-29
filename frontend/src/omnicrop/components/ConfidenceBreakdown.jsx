function ConfidenceBar({ label, value }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <span className="text-sm font-semibold text-gray-900">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gray-900"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceBreakdown({ result }) {
  const items = [
    { label: "Weather confidence", value: result.confidence_breakdown.weather },
    { label: "Soil confidence", value: result.confidence_breakdown.soil },
    { label: "Market confidence", value: result.confidence_breakdown.market },
    {
      label: "Regional fit confidence",
      value: result.confidence_breakdown.regional_fit,
    },
    { label: "Timing confidence", value: result.confidence_breakdown.timing },
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
            Confidence Breakdown
          </p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">
            Why confidence sits where it does
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Overall confidence rises when the major signal dimensions align and
            the leading scenario clearly outruns the alternatives.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Overall confidence
          </p>
          <p className="mt-1 text-3xl font-semibold">{result.confidence}%</p>
          <p className="mt-1 text-sm capitalize text-emerald-700">
            {result.confidence_label}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <ConfidenceBar label={item.label} value={item.value} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default ConfidenceBreakdown;

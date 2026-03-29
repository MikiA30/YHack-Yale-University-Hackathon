import DataQualityBadgeRow from "./DataQualityBadgeRow";

function ListBlock({ title, items, accent }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600">
            <span className={`mt-2 h-2 w-2 rounded-full ${accent}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sourceSummary(dataSources) {
  if (!dataSources) {
    return { label: "Demo data", tone: "bg-gray-100 text-gray-700" };
  }

  const values = Object.values(dataSources);
  const allLive = values.every((value) => value === "live");
  const someLive = values.some((value) => value === "live");

  if (allLive) {
    return { label: "Live data", tone: "bg-emerald-50 text-emerald-700" };
  }
  if (someLive) {
    return {
      label: "Mixed live/fallback",
      tone: "bg-amber-50 text-amber-700",
    };
  }
  return { label: "Fallback data", tone: "bg-gray-100 text-gray-700" };
}

function RecommendationCard({ result, loading }) {
  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-28 rounded-full bg-gray-200" />
          <div className="h-12 w-3/4 rounded-2xl bg-gray-100" />
          <div className="h-24 rounded-3xl bg-gray-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-28 rounded-3xl bg-gray-100" />
            <div className="h-28 rounded-3xl bg-gray-100" />
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
            Recommendation
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-gray-900">
            Ready for analysis
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-500">
            Run the model to see the recommended crop, timing window, supporting
            reasons, and operational risks.
          </p>
        </div>
      </section>
    );
  }

  const { recommendation, top_reasons, key_risks } = result;
  const sourceBadge = sourceSummary(result.data_sources);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
            Recommendation
          </p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {recommendation.action}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Confidence
            </p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {recommendation.confidence}%
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-2 text-xs font-semibold ${sourceBadge.tone}`}
          >
            {sourceBadge.label}
          </div>
        </div>
      </div>

      <DataQualityBadgeRow dataSources={result.data_sources} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
            Crop
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{recommendation.crop}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
            Timing
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{recommendation.timing}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
            Action
          </p>
          <p className="mt-2 text-lg font-semibold capitalize text-gray-900">
            {result.confidence_label} conviction
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-700">
        {recommendation.summary}
      </p>
      {result.resolved_location ? (
        <p className="mt-3 text-sm text-gray-500">
          Resolved location: {result.resolved_location.display_name}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Why This Crop
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {recommendation.why_crop}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Why This Timing
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {recommendation.why_timing}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Operational Note
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {recommendation.operational_note}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <ListBlock
            title="Top Reasons"
            items={top_reasons}
            accent="bg-emerald-400"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <ListBlock
            title="Key Risks"
            items={key_risks}
            accent="bg-amber-400"
          />
        </div>
      </div>
    </section>
  );
}

export default RecommendationCard;

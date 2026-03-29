import DataQualityBadgeRow from "./DataQualityBadgeRow";

function ListBlock({ title, items, accent }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-6 text-slate-300"
          >
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
    return { label: "Demo data", tone: "bg-white/10 text-slate-200" };
  }

  const values = Object.values(dataSources);
  const allLive = values.every((value) => value === "live");
  const someLive = values.some((value) => value === "live");

  if (allLive) {
    return { label: "Live data", tone: "bg-emerald-400/15 text-emerald-200" };
  }
  if (someLive) {
    return {
      label: "Mixed live/fallback",
      tone: "bg-amber-400/15 text-amber-100",
    };
  }
  return { label: "Fallback data", tone: "bg-white/10 text-slate-200" };
}

function RecommendationCard({ result, loading }) {
  if (loading) {
    return (
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-panel">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-28 rounded-full bg-white/20" />
          <div className="h-12 w-3/4 rounded-2xl bg-white/15" />
          <div className="h-24 rounded-3xl bg-white/10" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-28 rounded-3xl bg-white/10" />
            <div className="h-28 rounded-3xl bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/40 px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Recommendation
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-200">
            Ready for analysis
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
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
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Recommendation
          </p>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {recommendation.action}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-slate-700 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Confidence
            </p>
            <p className="mt-1 text-3xl font-semibold text-white">
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
        <div className="rounded-lg bg-slate-700/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
            Crop
          </p>
          <p className="mt-2 text-lg font-semibold">{recommendation.crop}</p>
        </div>
        <div className="rounded-lg bg-slate-700/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
            Timing
          </p>
          <p className="mt-2 text-lg font-semibold">{recommendation.timing}</p>
        </div>
        <div className="rounded-lg bg-slate-700/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
            Action
          </p>
          <p className="mt-2 text-lg font-semibold capitalize">
            {result.confidence_label} conviction
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-200">
        {recommendation.summary}
      </p>
      {result.resolved_location ? (
        <p className="mt-3 text-sm text-slate-300">
          Resolved location: {result.resolved_location.display_name}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg bg-slate-700/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Why This Crop
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {recommendation.why_crop}
          </p>
        </div>
        <div className="rounded-lg bg-slate-700/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Why This Timing
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {recommendation.why_timing}
          </p>
        </div>
        <div className="rounded-lg bg-slate-700/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Operational Note
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {recommendation.operational_note}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-slate-700/50 p-5">
          <ListBlock
            title="Top Reasons"
            items={top_reasons}
            accent="bg-emerald-400"
          />
        </div>
        <div className="rounded-xl bg-slate-700/50 p-5">
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

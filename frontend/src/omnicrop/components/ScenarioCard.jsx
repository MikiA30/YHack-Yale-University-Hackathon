function ScenarioCard({ scenario, highlighted }) {
  const riskTone = {
    Low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Medium: "bg-amber-50 text-amber-700 border border-amber-200",
    "Medium-High":
      "bg-orange-50 text-orange-700 border border-orange-200",
    High: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <article
      className={`rounded-xl border p-5 transition ${
        highlighted
          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-900 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-semibold uppercase tracking-[0.18em] ${
              highlighted ? "text-gray-300" : "text-gray-400"
            }`}
          >
            Scenario
          </p>
          <h3 className="mt-2 text-xl font-semibold">{scenario.label}</h3>
        </div>
        <div className="text-right">
          <p
            className={`text-xs uppercase tracking-[0.18em] ${highlighted ? "text-gray-300" : "text-gray-400"}`}
          >
            Score
          </p>
          <p className="mt-1 text-3xl font-semibold">{scenario.score}</p>
          {!highlighted && scenario.delta_from_best > 0 ? (
            <p
              className={`mt-1 text-xs font-medium ${highlighted ? "text-gray-300" : "text-gray-500"}`}
            >
              {scenario.delta_from_best} behind top path
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            highlighted
              ? "border border-white/20 bg-white/10 text-white"
              : riskTone[scenario.risk_level]
          }`}
        >
          {scenario.risk_level} risk
        </span>
        {highlighted ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            Recommended
          </span>
        ) : null}
      </div>

      {scenario.crop ? (
        <div
          className={`mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] ${highlighted ? "text-gray-300" : "text-gray-400"}`}
        >
          <span>{scenario.crop}</span>
          <span>
            {scenario.delay_days === 0
              ? "Immediate path"
              : `${scenario.delay_days}-day delay`}
          </span>
        </div>
      ) : null}

      <p
        className={`mt-4 text-sm leading-6 ${highlighted ? "text-gray-300" : "text-gray-500"}`}
      >
        {scenario.summary}
      </p>
    </article>
  );
}

export default ScenarioCard;

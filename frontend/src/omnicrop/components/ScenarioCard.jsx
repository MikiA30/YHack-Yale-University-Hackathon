function ScenarioCard({ scenario, highlighted }) {
  const riskTone = {
    Low: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30",
    Medium: "bg-amber-400/10 text-amber-300 border border-amber-400/30",
    "Medium-High":
      "bg-orange-400/10 text-orange-300 border border-orange-400/30",
    High: "bg-red-400/10 text-red-300 border border-red-400/30",
  };

  return (
    <article
      className={`rounded-xl border p-5 transition ${
        highlighted
          ? "border-violet-500 bg-slate-800 text-white"
          : "border-slate-700/50 bg-slate-800/60 text-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-semibold uppercase tracking-[0.18em] ${
              highlighted ? "text-violet-300" : "text-slate-400"
            }`}
          >
            Scenario
          </p>
          <h3 className="mt-2 text-xl font-semibold">{scenario.label}</h3>
        </div>
        <div className="text-right">
          <p
            className={`text-xs uppercase tracking-[0.18em] ${highlighted ? "text-slate-300" : "text-slate-400"}`}
          >
            Score
          </p>
          <p className="mt-1 text-3xl font-semibold">{scenario.score}</p>
          {!highlighted && scenario.delta_from_best > 0 ? (
            <p
              className={`mt-1 text-xs font-medium ${highlighted ? "text-slate-300" : "text-slate-500"}`}
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
              ? "bg-violet-600/20 text-violet-200 border border-violet-500/30"
              : riskTone[scenario.risk_level]
          }`}
        >
          {scenario.risk_level} risk
        </span>
        {highlighted ? (
          <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs font-semibold text-violet-200">
            Recommended
          </span>
        ) : null}
      </div>

      {scenario.crop ? (
        <div
          className={`mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] ${highlighted ? "text-slate-300" : "text-slate-400"}`}
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
        className={`mt-4 text-sm leading-6 ${highlighted ? "text-slate-300" : "text-slate-400"}`}
      >
        {scenario.summary}
      </p>
    </article>
  );
}

export default ScenarioCard;

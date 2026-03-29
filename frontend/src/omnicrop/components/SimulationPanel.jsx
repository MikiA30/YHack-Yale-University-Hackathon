function SegmentedOptions({ label, value, options, onChange, columns = 3 }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-700/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
          {label}
        </p>
      </div>
      <div
        className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                active
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
              }`}
              type="button"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
}) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-700/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
          {label}
        </p>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
          {formatValue(value)}
        </span>
      </div>
      <input
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-violet-500"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SimulationPanel({
  adjustments,
  baseFieldReadiness,
  enabled,
  error,
  isSimulating,
  isSimulationDirty,
  onAdjustmentChange,
  onReset,
}) {
  const effectiveFieldReadiness =
    adjustments.field_readiness_override ?? baseFieldReadiness;

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Scenario Simulator
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Adjust the assumptions and rerun the decision live
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            OmniCrop applies these changes to the last normalized analysis
            context. No external providers are called while you operate the
            simulator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200">
            {isSimulating
              ? "Simulation updating..."
              : isSimulationDirty
                ? "Simulation active"
                : "Using baseline analysis"}
          </span>
          <button
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-600"
            type="button"
            onClick={onReset}
            disabled={!enabled}
          >
            Reset
          </button>
        </div>
      </div>

      {!enabled ? (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Simulation is available after a backend-backed analysis. If OmniCrop
          is running on local fallback demo data only, the simulator stays
          disabled.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
        </div>
      ) : null}

      <div
        className={`mt-6 grid gap-4 xl:grid-cols-3 ${
          enabled ? "" : "pointer-events-none opacity-60"
        }`}
      >
        <SegmentedOptions
          label="Risk Tolerance"
          value={adjustments.risk_tolerance}
          options={[
            { label: "Conservative", value: "conservative" },
            { label: "Balanced", value: "balanced" },
            { label: "Aggressive", value: "aggressive" },
          ]}
          onChange={(value) => onAdjustmentChange("risk_tolerance", value)}
        />

        <SliderControl
          label="Timing Delay"
          value={adjustments.delay_days}
          min={0}
          max={7}
          onChange={(value) => onAdjustmentChange("delay_days", value)}
          formatValue={(value) =>
            value === 0 ? "Now" : `${value} day${value === 1 ? "" : "s"}`
          }
        />

        <SliderControl
          label="Rainfall Adjustment"
          value={adjustments.rain_adjustment_pct}
          min={-30}
          max={30}
          onChange={(value) => onAdjustmentChange("rain_adjustment_pct", value)}
          formatValue={(value) => `${value > 0 ? "+" : ""}${value}%`}
        />

        <SegmentedOptions
          label="Market Outlook"
          value={adjustments.market_outlook}
          options={[
            { label: "Bearish", value: "bearish" },
            { label: "Neutral", value: "neutral" },
            { label: "Bullish", value: "bullish" },
          ]}
          onChange={(value) => onAdjustmentChange("market_outlook", value)}
        />

        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-700/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Field Readiness
            </p>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
              {effectiveFieldReadiness}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Not Ready", "Nearly Ready", "Ready"].map((option) => {
              const active = effectiveFieldReadiness === option;
              return (
                <button
                  key={option}
                  className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
                  }`}
                  type="button"
                  onClick={() =>
                    onAdjustmentChange("field_readiness_override", option)
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <SegmentedOptions
          label="Crop Preference"
          value={adjustments.crop_preference}
          columns={2}
          options={[
            { label: "None", value: "None" },
            { label: "Favor Corn", value: "Favor Corn" },
            { label: "Favor Soybeans", value: "Favor Soybeans" },
            { label: "Favor Wheat", value: "Favor Wheat" },
          ]}
          onChange={(value) => onAdjustmentChange("crop_preference", value)}
        />
      </div>
    </section>
  );
}

export default SimulationPanel;

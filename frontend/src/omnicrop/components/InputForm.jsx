const cropChoices = ["Corn", "Soybeans", "Wheat"];

function InputForm({
  values,
  onFieldChange,
  onCropToggle,
  onSubmit,
  loading,
  error,
}) {
  const selectedCount = values.crop_options.length;

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
          Input Form
        </p>
        <h2 className="text-2xl font-semibold text-slate-200">Farm setup</h2>
        <p className="text-sm leading-6 text-slate-400">
          Start with sample values or adjust the inputs before running analysis.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-300"
            htmlFor="farm_name"
          >
            Farm Name
          </label>
          <input
            id="farm_name"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white outline-none transition focus:border-violet-500"
            type="text"
            value={values.farm_name}
            onChange={(event) => onFieldChange("farm_name", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-300"
            htmlFor="location"
          >
            Location
          </label>
          <input
            id="location"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white outline-none transition focus:border-violet-500"
            type="text"
            value={values.location}
            onChange={(event) => onFieldChange("location", event.target.value)}
            placeholder="e.g. 58701, Minot ND, or Des Moines, IA"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-300"
            htmlFor="acreage"
          >
            Acreage
          </label>
          <input
            id="acreage"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white outline-none transition focus:border-violet-500"
            type="number"
            min="1"
            value={values.acreage}
            onChange={(event) =>
              onFieldChange("acreage", Number(event.target.value))
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-300">
              Crop Options
            </label>
            <span className="text-xs font-medium text-slate-400">
              {selectedCount} selected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {cropChoices.map((crop) => {
              const checked = values.crop_options.includes(crop);
              return (
                <label
                  key={crop}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    checked
                      ? "border-violet-500 bg-violet-600/20 text-violet-200"
                      : "border-slate-600 bg-slate-700 text-slate-300"
                  }`}
                >
                  <input
                    className="h-4 w-4 accent-violet-500"
                    type="checkbox"
                    checked={checked}
                    onChange={() => onCropToggle(crop)}
                  />
                  <span className="text-sm font-medium">{crop}</span>
                </label>
              );
            })}
          </div>
          {selectedCount < 2 ? (
            <p className="text-sm text-amber-300">
              Select at least two crop options for comparison.
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-300"
              htmlFor="soil_moisture"
            >
              Soil Moisture
            </label>
            <select
              id="soil_moisture"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white outline-none transition focus:border-violet-500"
              value={values.soil_moisture}
              onChange={(event) =>
                onFieldChange("soil_moisture", event.target.value)
              }
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-300"
              htmlFor="field_readiness"
            >
              Field Readiness
            </label>
            <select
              id="field_readiness"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white outline-none transition focus:border-violet-500"
              value={values.field_readiness}
              onChange={(event) =>
                onFieldChange("field_readiness", event.target.value)
              }
            >
              <option value="Not Ready">Not Ready</option>
              <option value="Nearly Ready">Nearly Ready</option>
              <option value="Ready">Ready</option>
            </select>
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-violet-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={loading || selectedCount < 2}
        >
          {loading ? "Analyzing conditions..." : "Analyze"}
        </button>

        {error ? <p className="text-sm text-amber-300">{error}</p> : null}
      </form>
    </section>
  );
}

export default InputForm;

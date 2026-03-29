import { useEffect, useState } from "react";

import ConfidenceBreakdown from "../omnicrop/components/ConfidenceBreakdown";
import ChatPanel from "../omnicrop/components/ChatPanel";
import OmniCropHeader from "../omnicrop/components/Header";
import InputForm from "../omnicrop/components/InputForm";
import RecommendationCard from "../omnicrop/components/RecommendationCard";
import ScenarioCard from "../omnicrop/components/ScenarioCard";
import SignalCard from "../omnicrop/components/SignalCard";
import SimulationPanel from "../omnicrop/components/SimulationPanel";
import WeatherChart from "../omnicrop/components/WeatherChart";
import useSimulation from "../omnicrop/hooks/useSimulation";
import { analyzeFarm, checkBackendHealth } from "../omnicrop/api/api";
import { defaultFormValues } from "../omnicrop/lib/demoData";

function PlaceholderPanel({ title, body }) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-8 text-center text-slate-300">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6">{body}</p>
    </section>
  );
}

export default function OmniCropPage() {
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [analysisInputs, setAnalysisInputs] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisSource, setAnalysisSource] = useState("");
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const status = await checkBackendHealth();
      setBackendStatus(status);
    }

    loadStatus();
  }, []);

  function updateField(name, value) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  function toggleCrop(crop) {
    setFormValues((current) => {
      const exists = current.crop_options.includes(crop);
      const nextOptions = exists
        ? current.crop_options.filter((option) => option !== crop)
        : [...current.crop_options, crop];

      return { ...current, crop_options: nextOptions };
    });
  }

  async function handleAnalyze(event) {
    event.preventDefault();

    if (formValues.crop_options.length < 2) {
      setFormError("Choose at least two crops before analyzing.");
      return;
    }

    setLoading(true);
    setFormError("");
    setNotice("");

    const { data, source, error } = await analyzeFarm(formValues);
    if (!data) {
      setLoading(false);
      setAnalysisResult(null);
      setAnalysisInputs(null);
      setFormError(error || "Unable to analyze this location.");
      setUsingFallback(false);
      setAnalysisSource(source);
      return;
    }

    setAnalysisResult(data);
    setAnalysisInputs({
      ...formValues,
      crop_options: [...formValues.crop_options],
    });
    setAnalysisSource(source);
    setAnalysisVersion((current) => current + 1);
    setUsingFallback(source !== "backend");

    if (source === "backend") {
      setNotice("");
      setBackendStatus("online");
    } else if (source === "mock-endpoint") {
      setNotice(
        "Backend analysis failed, so OmniCrop is showing server demo data.",
      );
      setBackendStatus("online");
    } else {
      setNotice(
        "Backend is unavailable. OmniCrop is showing local demo data so the MVP remains usable.",
      );
      setBackendStatus("offline");
    }

    if (error && source !== "backend") {
      setFormError(error);
    }

    setLoading(false);
  }

  const simulationEnabled =
    Boolean(analysisResult?.base_context) &&
    analysisSource !== "local-fallback";
  const {
    adjustments,
    isSimulationDirty,
    isSimulating,
    resetAdjustments,
    simulationError,
    simulationResult,
    updateAdjustment,
  } = useSimulation({
    analysisVersion,
    baseContext: analysisResult?.base_context,
    userInputs: analysisInputs,
    enabled: simulationEnabled,
  });
  const result = simulationResult ?? analysisResult;
  const recommendedScenario = result?.scenarios?.[0]?.label;
  const statusTone =
    backendStatus === "online"
      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
      : "bg-amber-400/10 text-amber-300 border border-amber-400/30";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
          >
            Modules
          </a>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            A.U.R.A.
          </span>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            Module: OmniCrop
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            Demo Mode
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
          >
            {backendStatus === "online"
              ? "Backend connected"
              : "Fallback ready"}
          </span>
          {usingFallback ? (
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              Showing demo data
            </span>
          ) : null}
        </div>

        <div className="space-y-8">
          <OmniCropHeader />

          {notice ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              {notice}
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr,1.35fr]">
            <InputForm
              values={formValues}
              onFieldChange={updateField}
              onCropToggle={toggleCrop}
              onSubmit={handleAnalyze}
              loading={loading}
              error={formError}
            />
            <RecommendationCard result={result} loading={loading} />
          </section>

          {result ? (
            <>
              <SimulationPanel
                adjustments={adjustments}
                baseFieldReadiness={analysisInputs?.field_readiness}
                enabled={simulationEnabled}
                error={simulationError}
                isSimulating={isSimulating}
                isSimulationDirty={isSimulationDirty}
                onAdjustmentChange={updateAdjustment}
                onReset={resetAdjustments}
              />

              <section className="grid gap-4 md:grid-cols-3">
                <SignalCard signal={result.signals.local} />
                <SignalCard signal={result.signals.market} />
                <SignalCard signal={result.signals.risk} />
              </section>

              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Scenario Comparison
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-200">
                      Compare likely planting paths
                    </h2>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  {result.scenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.label}
                      scenario={scenario}
                      highlighted={scenario.label === recommendedScenario}
                    />
                  ))}
                </div>
              </section>

              <WeatherChart data={result.charts.weather_forecast} />

              <ConfidenceBreakdown result={result} />
            </>
          ) : (
            <>
              <PlaceholderPanel
                title="Simulation"
                body="Run the initial analysis to unlock the simulator controls and live decision updates."
              />
              <PlaceholderPanel
                title="Signals And Scenarios"
                body="Signal summaries, scenario comparisons, the decision window, and confidence breakdown appear here after the first model run."
              />
            </>
          )}
        </div>
        <ChatPanel analysis={result} />
      </main>
    </div>
  );
}

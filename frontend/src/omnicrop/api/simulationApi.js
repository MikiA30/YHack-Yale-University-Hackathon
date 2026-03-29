const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const defaultSimulationAdjustments = {
  risk_tolerance: "balanced",
  delay_days: 0,
  rain_adjustment_pct: 0,
  market_outlook: "neutral",
  field_readiness_override: null,
  crop_preference: "None",
};

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.detail || `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function simulateFarm({ baseContext, userInputs, adjustments }) {
  try {
    const response = await fetch(`${API_BASE}/domains/omnicrop/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_context: baseContext,
        user_inputs: userInputs,
        adjustments,
      }),
    });
    const data = await parseJson(response);
    return { data, error: "" };
  } catch (error) {
    return {
      data: null,
      error: error.message || "Simulation update failed.",
    };
  }
}

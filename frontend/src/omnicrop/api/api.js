import { demoAnalysis } from "../lib/demoData";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

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

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await parseJson(response);
    return data.status === "ok" ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function analyzeFarm(payload) {
  try {
    const response = await fetch(`${API_BASE}/domains/omnicrop/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    return { data, source: "backend", error: "" };
  } catch (postError) {
    if (postError.status === 422) {
      return {
        data: null,
        source: "validation-error",
        error: postError.message,
      };
    }

    try {
      const response = await fetch(`${API_BASE}/domains/omnicrop/mock-data`);
      const data = await parseJson(response);
      return { data, source: "mock-endpoint", error: postError.message };
    } catch {
      return {
        data: demoAnalysis,
        source: "local-fallback",
        error: postError.message,
      };
    }
  }
}

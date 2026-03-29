import os
from importlib import import_module
from pathlib import Path
from types import ModuleType
from urllib.parse import quote

from dotenv import load_dotenv

from app.domains.omnicrop.services import get_mock_analysis_response

load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv(Path(__file__).resolve().parents[4] / ".env")

DEFAULT_MODEL = "claude-sonnet-4-6-20250514"

SYSTEM_PROMPT = """You are A.U.R.A., an agriculture decision assistant for OmniCrop.

Rules:
- Keep answers SHORT. 2-4 sentences max unless the user asks for detail.
- Use plain language. No bullet points, no headers, no emojis, no filler.
- Ground every answer in the provided analysis. Cite exact crops, confidence, risk, timing, and scenario scores when relevant.
- If asked what to harvest, plant, delay, or prioritize, answer from the recommendation and scenarios already provided. Do not invent new agronomy.
- If the analysis is fallback or demo data, say so briefly when it matters.
- If you do not have enough data, say that in one sentence instead of guessing.
"""


def _get_httpx() -> ModuleType | None:
    try:
        return import_module("httpx")
    except ModuleNotFoundError:
        return None


def _build_analysis_context(analysis: dict) -> str:
    recommendation = analysis["recommendation"]
    resolved_location = analysis.get("resolved_location", {})
    signals = analysis["signals"]
    scenarios = analysis.get("scenarios", [])
    data_sources = analysis.get("data_sources", {})

    scenario_lines = []
    for scenario in scenarios[:4]:
        scenario_lines.append(
            f"- {scenario['label']}: score {scenario['score']}, risk {scenario['risk_level']}, "
            f"crop {scenario.get('crop', 'n/a')}, delay {scenario.get('delay_days', 0)} days, "
            f"summary: {scenario['summary']}"
        )

    signal_lines = [
        f"- {signals['local']['label']}: {signals['local']['status']} (score {signals['local']['score']}) — {signals['local']['summary']}",
        f"- {signals['market']['label']}: {signals['market']['status']} (score {signals['market']['score']}) — {signals['market']['summary']}",
        f"- {signals['risk']['label']}: {signals['risk']['status']} (score {signals['risk']['score']}) — {signals['risk']['summary']}",
    ]

    source_line = ", ".join(
        f"{name}={status}" for name, status in data_sources.items()
    )

    return f"""OMNICROP ANALYSIS
Location: {resolved_location.get('display_name', 'Unknown')}
Recommendation: {recommendation['action']}
Recommended crop: {recommendation['crop']}
Timing: {recommendation['timing']}
Confidence: {analysis['confidence']}% ({analysis['confidence_label']})
Recommendation summary: {recommendation['summary']}
Why crop: {recommendation.get('why_crop', '')}
Why timing: {recommendation.get('why_timing', '')}
Operational note: {recommendation.get('operational_note', '')}

Signals:
{chr(10).join(signal_lines)}

Top reasons:
{chr(10).join(f"- {item}" for item in analysis.get('top_reasons', []))}

Key risks:
{chr(10).join(f"- {item}" for item in analysis.get('key_risks', []))}

Scenarios:
{chr(10).join(scenario_lines)}

Recommendation sensitivity:
{chr(10).join(f"- {item}" for item in analysis.get('what_would_change', []))}

Data sources:
{source_line}
"""


def chat_harvest(user_message: str, analysis: dict | None = None, model: str | None = None) -> dict[str, str]:
    httpx = _get_httpx()
    lava_forward_token = os.getenv("LAVA_FORWARD_TOKEN", "").strip()
    if not lava_forward_token or httpx is None:
        return {
            "response": "AI chat is not configured. Set LAVA_FORWARD_TOKEN to enable.",
            "model": "none",
        }

    model = model or DEFAULT_MODEL
    active_analysis = analysis or get_mock_analysis_response().model_dump()
    analysis_context = _build_analysis_context(active_analysis)

    target_url = "https://api.anthropic.com/v1/messages"
    lava_url = f"https://api.lava.so/v1/forward?u={quote(target_url, safe='')}"

    try:
        response = httpx.post(
            lava_url,
            headers={
                "Authorization": f"Bearer {lava_forward_token}",
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": model,
                "max_tokens": 250,
                "messages": [
                    {
                        "role": "user",
                        "content": f"{SYSTEM_PROMPT}\n\n---\n\nCURRENT OMNICROP ANALYSIS:\n{analysis_context}\n\n---\n\nUSER QUESTION: {user_message}",
                    },
                ],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return {"response": data["content"][0]["text"].strip(), "model": model}
    except Exception as exc:
        return {
            "response": f"Sorry, I couldn't process that right now. Error: {str(exc)}",
            "model": model,
        }

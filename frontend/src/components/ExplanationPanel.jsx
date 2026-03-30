import { useState } from "react";
import api from "../api";

export default function ExplanationPanel() {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = () => {
    setLoading(true);
    api("/explain")
      .then((r) => r.json())
      .then((data) => {
        setExplanation(data.explanation);
        setLoading(false);
      });
  };

  return (
    <section>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              AI Explanation
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Why is A.U.R.A. making these recommendations?
            </p>
          </div>
          <button
            onClick={fetchExplanation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 hover:bg-black text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.97]"
          >
            {loading ? (
              <>
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Thinking…
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Explain
              </>
            )}
          </button>
        </div>

        <div className="px-6 py-4">
          {explanation ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {explanation}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Click "Explain" to get an AI-generated summary of why these demand
              signals are moving the way they are.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

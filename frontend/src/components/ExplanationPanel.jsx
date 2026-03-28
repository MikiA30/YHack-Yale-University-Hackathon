import { useState } from 'react'

export default function ExplanationPanel() {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchExplanation = () => {
    setLoading(true)
    fetch('/explain')
      .then(r => r.json())
      .then(data => {
        setExplanation(data.explanation)
        setLoading(false)
      })
  }

  return (
    <section>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">AI Explanation</h2>
          <button
            onClick={fetchExplanation}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Why?'}
          </button>
        </div>
        {explanation ? (
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
            {explanation}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            Click "Why?" to see why A.U.R.A. is making these recommendations.
          </p>
        )}
      </div>
    </section>
  )
}

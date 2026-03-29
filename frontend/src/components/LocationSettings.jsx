import { useState, useEffect } from 'react'

export default function LocationSettings() {
  const [location, setLocation] = useState(null)
  const [zip, setZip] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/location')
      .then(r => r.json())
      .then(setLocation)
      .catch(() => {})
  }, [])

  const submit = () => {
    if (!zip || zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setError('Please enter a valid 5-digit zip code.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(false)
    fetch('/set_location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip_code: zip }),
    })
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e.detail))
        return r.json()
      })
      .then(data => {
        setLocation(data)
        setSuccess(true)
        setZip('')
        setBusy(false)
        setTimeout(() => setSuccess(false), 3000)
      })
      .catch(msg => {
        setError(typeof msg === 'string' ? msg : 'Could not find that zip code.')
        setBusy(false)
      })
  }

  return (
    <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Store Location</h2>
          <p className="text-xs text-slate-400">Used for live weather forecasts</p>
        </div>
      </div>

      {location && (
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">{location.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              ZIP {location.zip} &nbsp;·&nbsp; {location.lat.toFixed(4)}°N, {Math.abs(location.lon).toFixed(4)}°W
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400">
            Current
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-400 mb-1 block">Update ZIP Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={e => {
              setZip(e.target.value.replace(/\D/g, ''))
              setError(null)
              setSuccess(false)
            }}
            onKeyDown={e => e.key === 'Enter' && !busy && submit()}
            placeholder="e.g. 10001"
            className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={submit}
            disabled={busy || zip.length !== 5}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors disabled:opacity-40 active:scale-95"
          >
            {busy ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Looking up...
              </span>
            ) : 'Update'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ Location updated — weather forecast will refresh on next load.
        </p>
      )}
    </section>
  )
}

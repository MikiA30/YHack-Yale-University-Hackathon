import { useState, useEffect } from "react";

export default function LocationSettings() {
  const [location, setLocation] = useState(null);
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/location")
      .then((r) => r.json())
      .then(setLocation)
      .catch(() => {});
  }, []);

  const submit = () => {
    if (!zip || zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit zip code.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(false);
    fetch("/set_location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip_code: zip }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.detail));
        return r.json();
      })
      .then((data) => {
        setLocation(data);
        setSuccess(true);
        setZip("");
        setBusy(false);
        setTimeout(() => setSuccess(false), 3000);
      })
      .catch((msg) => {
        setError(
          typeof msg === "string" ? msg : "Could not find that zip code.",
        );
        setBusy(false);
      });
  };

  return (
    <section>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Store Location
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Used for live 14-day weather forecasts
            </p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Current location display */}
          {location && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {location.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {location.zip}
                  <span className="font-sans ml-2 text-gray-300">·</span>
                  <span className="font-sans ml-2">
                    {location.lat.toFixed(4)}°N,{" "}
                    {Math.abs(location.lon).toFixed(4)}°W
                  </span>
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-900 text-white">
                Active
              </span>
            </div>
          )}

          {/* Zip input row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Update ZIP Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => {
                  setZip(e.target.value.replace(/\D/g, ""));
                  setError(null);
                  setSuccess(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
                placeholder="e.g. 10001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-all duration-150"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={submit}
                disabled={busy || zip.length !== 5}
                className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-medium transition-all duration-150 disabled:opacity-40 active:scale-[0.97] flex items-center gap-2"
              >
                {busy ? (
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
                    Looking up…
                  </>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <svg
                className="w-4 h-4 text-red-500 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <p className="text-xs font-medium text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <svg
                className="w-4 h-4 text-emerald-500 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-xs font-medium text-emerald-700">
                Location updated — weather forecast will refresh on next
                request.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

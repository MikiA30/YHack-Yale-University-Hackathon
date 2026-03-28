import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const ITEMS = [
  'Red Bull', 'Bottled Water', 'Chips', 'Candy',
  'Coffee', 'Ice', 'Sunglasses', 'Beef Jerky',
]

// Local barcode fallback — add known codes here
const BARCODE_MAP = {
}

// Map product names from Open Food Facts → our inventory items
const NAME_RULES = [
  { match: /red bull/i, item: 'Red Bull' },
  { match: /water|dasani|aquafina|poland spring|evian/i, item: 'Bottled Water' },
  { match: /chip|lay|dorito|tostito|frito/i, item: 'Chips' },
  { match: /snickers|m&m|candy|skittles|twix|reese/i, item: 'Candy' },
  { match: /coffee|starbucks|frappuccino/i, item: 'Coffee' },
  { match: /ice\b/i, item: 'Ice' },
  { match: /sunglass/i, item: 'Sunglasses' },
  { match: /jerky|slim jim/i, item: 'Beef Jerky' },
]

function matchProductName(productName, brands) {
  const text = `${productName} ${brands || ''}`.toLowerCase()
  for (const rule of NAME_RULES) {
    if (rule.match.test(text)) return rule.item
  }
  return null
}

export default function EmployeePage() {
  const [selected, setSelected] = useState(ITEMS[0])
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [stock, setStock] = useState(null)
  const [customQty, setCustomQty] = useState('')

  // Scanner state
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const scannerRef = useRef(null)

  // Fetch current stock for selected item
  useEffect(() => {
    fetch('/inventory')
      .then(r => r.json())
      .then(data => {
        const row = data.inventory.find(r => r.item === selected)
        if (row) setStock(row.current_stock)
      })
  }, [selected, feedback])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const doAction = (action, amount, itemName) => {
    const item = itemName || selected
    setBusy(true)
    setFeedback(null)
    fetch('/update_inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, action, amount }),
    })
      .then(r => r.json())
      .then(data => {
        setFeedback({
          action,
          amount,
          item,
          prev: data.previous_stock,
          now: data.current_stock,
        })
        setSelected(item)
        setStock(data.current_stock)
        setBusy(false)
      })
  }

  const startScanner = () => {
    setScanResult(null)
    setScanError(null)
    setScanning(true)

    // Small delay to let the DOM element render
    setTimeout(() => {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // Barcode detected
          scanner.stop().then(() => {
            scannerRef.current = null
            setScanning(false)
            handleBarcode(decodedText)
          }).catch(() => {})
        },
        () => {} // ignore scan-miss frames
      ).catch((err) => {
        setScanning(false)
        setScanError('Camera access denied or unavailable. Use manual controls below.')
        scannerRef.current = null
      })
    }, 100)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null
        setScanning(false)
      }).catch(() => {
        setScanning(false)
      })
    } else {
      setScanning(false)
    }
  }

  const handleBarcode = async (code) => {
    // 1. Check local map first
    const local = BARCODE_MAP[code]
    if (local) {
      setScanResult({ code, productName: local, item: local, status: 'success' })
      doAction('sold', 1, local)
      return
    }

    // 2. Look up on Open Food Facts
    setScanResult({ code, productName: null, item: null, status: 'looking_up' })
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()

      if (data.status === 1 && data.product) {
        const productName = data.product.product_name || 'Unknown'
        const brands = data.product.brands || ''
        const matched = matchProductName(productName, brands)

        const displayName = `${productName}${brands ? ` (${brands})` : ''}`
        if (matched) {
          setScanResult({ code, productName: displayName, item: matched, status: 'success' })
          doAction('sold', 1, matched)
        } else {
          setScanResult({ code, productName: displayName, item: null, status: 'no_match' })
          // Notify manager about unrecognized product
          fetch('/notify_scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: code, product_name: productName, brands }),
          })
        }
        return
      }
    } catch {
      // API failed, fall through
    }

    // 3. Nothing found
    setScanResult({ code, productName: null, item: null, status: 'unknown' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-700/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Employee Mode</h1>
            <p className="text-xs text-slate-400">Scan & Update Inventory</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full space-y-6">

        {/* Barcode scanner section */}
        <div className="w-full space-y-3">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4" />
              </svg>
              Scan Item
            </button>
          ) : (
            <div className="space-y-3">
              <div id="barcode-reader" className="w-full rounded-xl overflow-hidden" />
              <button
                onClick={stopScanner}
                className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {scanError && (
            <div className="w-full rounded-xl p-4 border bg-amber-500/10 border-amber-500/30 text-amber-400 text-sm text-center">
              {scanError}
            </div>
          )}

          {scanResult && (
            <div className={`w-full rounded-xl p-4 border text-center text-sm ${
              scanResult.status === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : scanResult.status === 'looking_up'
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                : scanResult.status === 'no_match'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <p className="text-xs opacity-75 mb-1">Scanned: {scanResult.code}</p>
              {scanResult.productName && (
                <p className="text-xs opacity-75 mb-1">Product: {scanResult.productName}</p>
              )}
              {scanResult.status === 'looking_up' && (
                <p className="font-medium">Looking up product...</p>
              )}
              {scanResult.status === 'success' && (
                <p className="font-medium">Sold 1 × {scanResult.item}</p>
              )}
              {scanResult.status === 'no_match' && (
                <div>
                  <p className="font-medium mb-2">Product not in inventory — manager notified</p>
                  <p className="text-xs opacity-75 mb-2">Select the closest item to record this sale:</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {ITEMS.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          setScanResult({ ...scanResult, item: name, status: 'success' })
                          doAction('sold', 1, name)
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {scanResult.status === 'unknown' && (
                <p className="font-medium">Unknown barcode — use manual selection</p>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500">or select manually</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Item selector */}
        <div className="w-full space-y-2">
          <label className="text-sm text-slate-400">Select Item</label>
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setFeedback(null) }}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg focus:outline-none focus:border-violet-500"
          >
            {ITEMS.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Current stock display */}
        <div className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 text-center">
          <p className="text-slate-400 text-sm">Current Stock</p>
          <p className="text-4xl font-bold text-white mt-1">
            {stock !== null ? stock : '—'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="w-full grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => doAction('sold', 1)}
            className="py-4 rounded-xl bg-red-600/80 hover:bg-red-500 text-white font-semibold text-lg transition-colors disabled:opacity-40 active:scale-95"
          >
            Sell 1
          </button>
          <button
            disabled={busy}
            onClick={() => doAction('sold', 5)}
            className="py-4 rounded-xl bg-red-600/80 hover:bg-red-500 text-white font-semibold text-lg transition-colors disabled:opacity-40 active:scale-95"
          >
            Sell 5
          </button>
          <button
            disabled={busy}
            onClick={() => doAction('restock', 10)}
            className="py-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors disabled:opacity-40 active:scale-95 col-span-2"
          >
            Restock +10
          </button>
        </div>

        {/* Custom quantity */}
        <div className="w-full space-y-2">
          <label className="text-sm text-slate-400">Custom Quantity</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={customQty}
              onChange={e => setCustomQty(e.target.value)}
              placeholder="Enter amount..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg focus:outline-none focus:border-violet-500"
            />
            <button
              disabled={busy || !customQty || parseInt(customQty) < 1}
              onClick={() => { doAction('sold', parseInt(customQty)); setCustomQty('') }}
              className="px-4 py-3 rounded-xl bg-red-600/80 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 active:scale-95"
            >
              Sell
            </button>
            <button
              disabled={busy || !customQty || parseInt(customQty) < 1}
              onClick={() => { doAction('restock', parseInt(customQty)); setCustomQty('') }}
              className="px-4 py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-40 active:scale-95"
            >
              Restock
            </button>
          </div>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className={`w-full rounded-xl p-4 border text-center text-sm ${
            feedback.action === 'sold'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <p className="font-medium">
              {feedback.action === 'sold' ? 'Sold' : 'Restocked'} {feedback.amount} × {feedback.item}
            </p>
            <p className="mt-1 text-xs opacity-75">
              {feedback.prev} → {feedback.now} units
            </p>
          </div>
        )}

        {/* Link back */}
        <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-4">
          ← Back to Dashboard
        </a>
      </main>
    </div>
  )
}

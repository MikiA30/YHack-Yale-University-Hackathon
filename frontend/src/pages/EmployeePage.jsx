import { useState, useEffect, useRef } from "react";
import AuraLogo from "../components/AuraLogo";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api";

const ITEMS = [
  "Red Bull Cherry Sakura",
  "Red Bull White Peach",
  "Dasani Water",
  "Lay's Classic",
  "Feastables Peanut Butter",
  "Feastables Cookies & Creme",
  "Feastables Caramel",
  "Starbucks Frappuccino",
  "Ice",
  "Sunglasses",
  "Jack Link's Beef Jerky",
];

// Local barcode fallback — add known codes here
const BARCODE_MAP = {};

// Map product names from Open Food Facts → our inventory items
// Red Bull flavor rules MUST come before the generic Red Bull catch-all
const NAME_RULES = [
  {
    match: /red bull.*(cherry|sakura)|(cherry.*sakura|sakura.*cherry)/i,
    item: "Red Bull Cherry Sakura",
  },
  {
    match: /red bull.*(white.*peach|peach)|(white.*peach)/i,
    item: "Red Bull White Peach",
  },
  { match: /red bull/i, item: null }, // unknown RB flavor → notify manager
  { match: /water|dasani|aquafina|poland spring|evian/i, item: "Dasani Water" },
  { match: /chip|lay'?s|dorito|tostito|frito/i, item: "Lay's Classic" },
  {
    match: /feastables.*(peanut butter|peanut)/i,
    item: "Feastables Peanut Butter",
  },
  {
    match: /feastables.*(cookie|creme|cream|oreo)/i,
    item: "Feastables Cookies & Creme",
  },
  {
    match: /feastables.*caram/i,
    item: "Feastables Caramel",
  },
  { match: /feastables|mrbeast|mr beast/i, item: null }, // unknown Feastables flavor → notify manager
  { match: /coffee|starbucks|frappuccino/i, item: "Starbucks Frappuccino" },
  { match: /\bice\b/i, item: "Ice" },
  { match: /sunglass/i, item: "Sunglasses" },
  { match: /jerky|jack link|slim jim/i, item: "Jack Link's Beef Jerky" },
];

function matchProductName(productName, brands) {
  const text = `${productName} ${brands || ""}`.toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.match.test(text)) return rule.item;
  }
  return null;
}

export default function EmployeePage() {
  const [selected, setSelected] = useState(ITEMS[0]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stock, setStock] = useState(null);
  const [customQty, setCustomQty] = useState("");

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);

  // Fetch current stock for selected item
  useEffect(() => {
    api("/inventory")
      .then((r) => r.json())
      .then((data) => {
        const row = data.inventory.find((r) => r.item === selected);
        if (row) setStock(row.current_stock);
      });
  }, [selected, feedback]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const doAction = (action, amount, itemName) => {
    const item = itemName || selected;
    setBusy(true);
    setFeedback(null);
    api("/update_inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, action, amount }),
    })
      .then((r) => r.json())
      .then((data) => {
        setFeedback({
          action,
          amount,
          item,
          prev: data.previous_stock,
          now: data.current_stock,
        });
        setSelected(item);
        setStock(data.current_stock);
        setBusy(false);
      });
  };

  const startScanner = () => {
    setScanResult(null);
    setScanError(null);
    setScanning(true);

    // Small delay to let the DOM element render
    setTimeout(() => {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            // Barcode detected
            scanner
              .stop()
              .then(() => {
                scannerRef.current = null;
                setScanning(false);
                handleBarcode(decodedText);
              })
              .catch(() => {});
          },
          () => {}, // ignore scan-miss frames
        )
        .catch(() => {
          setScanning(false);
          setScanError(
            "Camera access denied or unavailable. Use manual controls below.",
          );
          scannerRef.current = null;
        });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setScanning(false);
        })
        .catch(() => {
          setScanning(false);
        });
    } else {
      setScanning(false);
    }
  };

  const handleBarcode = async (code) => {
    // 1. Check local map first
    const local = BARCODE_MAP[code];
    if (local) {
      setScanResult({
        code,
        productName: local,
        item: local,
        status: "success",
      });
      doAction("sold", 1, local);
      return;
    }

    // 2. Look up on Open Food Facts
    setScanResult({
      code,
      productName: null,
      item: null,
      status: "looking_up",
    });
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      );
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const productName = data.product.product_name || "Unknown";
        const brands = data.product.brands || "";
        const matched = matchProductName(productName, brands);

        const displayName = `${productName}${brands ? ` (${brands})` : ""}`;
        if (matched) {
          setScanResult({
            code,
            productName: displayName,
            item: matched,
            status: "success",
          });
          doAction("sold", 1, matched);
        } else {
          setScanResult({
            code,
            productName: displayName,
            item: null,
            status: "no_match",
          });
          // Notify manager about unrecognized product
          api("/notify_scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barcode: code,
              product_name: productName,
              brands,
            }),
          });
        }
        return;
      }
    } catch {
      // API failed, fall through
    }

    // 3. Nothing found
    setScanResult({ code, productName: null, item: null, status: "unknown" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
        <div className="px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AuraLogo size={28} />
            <div>
              <h1 className="text-sm font-semibold text-gray-900 leading-none">
                Employee Mode
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Scan & Update Inventory
              </p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium transition-all duration-150"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full space-y-5">
        {/* Barcode scanner section */}
        <div className="w-full space-y-3">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-base transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4"
                />
              </svg>
              Scan Barcode
            </button>
          ) : (
            <div className="space-y-3">
              <div
                id="barcode-reader"
                className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm"
              />
              <button
                onClick={stopScanner}
                className="w-full py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm transition-all duration-150"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {scanError && (
            <div className="w-full rounded-xl p-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm text-center">
              {scanError}
            </div>
          )}

          {scanResult && (
            <div
              className={`w-full rounded-xl p-4 border text-center text-sm ${
                scanResult.status === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : scanResult.status === "looking_up"
                    ? "bg-gray-50 border-gray-200 text-gray-600"
                    : scanResult.status === "no_match"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <p className="text-xs text-gray-400 mb-1 font-mono">
                {scanResult.code}
              </p>
              {scanResult.productName && (
                <p className="text-xs text-gray-500 mb-2">
                  {scanResult.productName}
                </p>
              )}
              {scanResult.status === "looking_up" && (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin text-gray-500"
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
                  <p className="font-medium text-gray-600">
                    Looking up product…
                  </p>
                </div>
              )}
              {scanResult.status === "success" && (
                <p className="font-semibold">✓ Sold 1 × {scanResult.item}</p>
              )}
              {scanResult.status === "no_match" && (
                <div>
                  <p className="font-semibold mb-1">
                    Not in inventory — manager notified
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Select the closest match to record this sale:
                  </p>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {ITEMS.map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setScanResult({
                            ...scanResult,
                            item: name,
                            status: "success",
                          });
                          doAction("sold", 1, name);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-150 active:scale-[0.97]"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {scanResult.status === "unknown" && (
                <p className="font-medium">
                  Unknown barcode — use manual selection below
                </p>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">
            or select manually
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Item selector + stock */}
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Select Item
            </label>
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setFeedback(null);
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-all duration-150"
            >
              {ITEMS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock display */}
          <div className="px-4 py-4 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Current Stock
            </p>
            <p className="text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
              {stock !== null ? stock : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">units in inventory</p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() => doAction("sold", 1)}
            className="py-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-all duration-150 disabled:opacity-40 active:scale-[0.97]"
          >
            Sell 1
          </button>
          <button
            disabled={busy}
            onClick={() => doAction("sold", 5)}
            className="py-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-all duration-150 disabled:opacity-40 active:scale-[0.97]"
          >
            Sell 5
          </button>
          <button
            disabled={busy}
            onClick={() => doAction("restock", 10)}
            className="py-3.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm transition-all duration-150 disabled:opacity-40 active:scale-[0.97] col-span-2"
          >
            Restock +10
          </button>
        </div>

        {/* Custom quantity */}
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
          <label className="block text-xs font-medium text-gray-500">
            Custom Quantity
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              placeholder="Enter amount…"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-all duration-150"
            />
            <button
              disabled={busy || !customQty || parseInt(customQty) < 1}
              onClick={() => {
                doAction("sold", parseInt(customQty));
                setCustomQty("");
              }}
              className="px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold transition-all duration-150 disabled:opacity-40 active:scale-[0.97]"
            >
              Sell
            </button>
            <button
              disabled={busy || !customQty || parseInt(customQty) < 1}
              onClick={() => {
                doAction("restock", parseInt(customQty));
                setCustomQty("");
              }}
              className="px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-all duration-150 disabled:opacity-40 active:scale-[0.97]"
            >
              Restock
            </button>
          </div>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div
            className={`w-full rounded-xl p-4 border text-center text-sm ${
              feedback.action === "sold"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <p className="font-semibold">
              {feedback.action === "sold" ? "Sold" : "Restocked"}{" "}
              {feedback.amount} × {feedback.item}
            </p>
            <p className="mt-0.5 text-xs opacity-60">
              {feedback.prev} → {feedback.now} units
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="pb-2" />
      </main>
    </div>
  );
}

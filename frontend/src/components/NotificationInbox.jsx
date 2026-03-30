import { useState, useEffect } from "react";
import api from "../api";

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifs = () => {
    api("/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications));
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 3000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id) => {
    api("/dismiss_notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then(() => fetchNotifs());
  };

  if (notifications.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Scan Notifications
        </h2>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white text-xs font-bold">
          {notifications.length}
        </span>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="group flex items-center justify-between gap-4 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative"
          >
            {/* left accent */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-900" />

            {/* icon */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
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
                  d="M12 4v1m0 14v1M4.22 4.22l.7.7m13.16 13.16l.7.7M1 12h1m20 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M9 12a3 3 0 106 0 3 3 0 00-6 0z"
                />
              </svg>
            </div>

            {/* text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {n.product_name}
                {n.brands ? (
                  <span className="font-normal text-gray-500">
                    {" "}
                    — {n.brands}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {n.barcode}
                <span className="font-sans ml-1.5 text-gray-400">
                  · Not in inventory
                </span>
              </p>
            </div>

            {/* dismiss */}
            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium transition-all duration-150 active:scale-[0.97]"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

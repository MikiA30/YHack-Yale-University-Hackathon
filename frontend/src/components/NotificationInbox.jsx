import { useState, useEffect } from 'react'

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState([])

  const fetchNotifs = () => {
    fetch('/notifications')
      .then(r => r.json())
      .then(data => setNotifications(data.notifications))
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 3000)
    return () => clearInterval(interval)
  }, [])

  const dismiss = (id) => {
    fetch('/dismiss_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(() => fetchNotifs())
  }

  if (notifications.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
        Scan Notifications
        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
          {notifications.length}
        </span>
      </h2>
      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border bg-violet-500/5 border-violet-500/30">
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {n.product_name}{n.brands ? ` — ${n.brands}` : ''}
              </p>
              <p className="text-xs text-slate-400">
                Barcode: {n.barcode} · Not in inventory
              </p>
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

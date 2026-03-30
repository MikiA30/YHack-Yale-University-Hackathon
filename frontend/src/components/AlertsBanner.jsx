const levelStyle = {
  critical: {
    bar: "bg-red-500",
    bg: "bg-red-50 border-red-100",
    icon: "bg-red-100 text-red-600",
    text: "text-red-800",
    sub: "text-red-500",
  },
  warning: {
    bar: "bg-amber-400",
    bg: "bg-amber-50 border-amber-100",
    icon: "bg-amber-100 text-amber-600",
    text: "text-amber-800",
    sub: "text-amber-500",
  },
  info: {
    bar: "bg-blue-400",
    bg: "bg-blue-50 border-blue-100",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-800",
    sub: "text-blue-400",
  },
};

const levelIcon = {
  critical: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  ),
  warning: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export default function AlertsBanner({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Alerts
        </h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((a, i) => {
          const s = levelStyle[a.level] ?? levelStyle.info;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border overflow-hidden relative transition-all duration-150 hover:shadow-sm ${s.bg}`}
            >
              {/* left accent bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-0.5 ${s.bar}`}
              />

              {/* icon */}
              <div
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${s.icon}`}
              >
                {levelIcon[a.level] ?? levelIcon.info}
              </div>

              {/* content */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-snug ${s.text}`}>
                  {a.message}
                </p>
                <p className={`text-xs mt-0.5 capitalize font-medium ${s.sub}`}>
                  {a.level}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SignalCard({ signal }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
            {signal.label}
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {signal.status}
          </p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-right text-violet-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Score
          </p>
          <p className="text-2xl font-semibold">{signal.score}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-500">{signal.summary}</p>
    </article>
  );
}

export default SignalCard;

function SignalCard({ signal }) {
  return (
    <article className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {signal.label}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-200">
            {signal.status}
          </p>
        </div>
        <div className="rounded-lg bg-slate-700 px-3 py-2 text-right text-violet-300">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Score
          </p>
          <p className="text-2xl font-semibold">{signal.score}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{signal.summary}</p>
    </article>
  );
}

export default SignalCard;

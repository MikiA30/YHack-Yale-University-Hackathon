function WhatWouldChangeCard({ items }) {
  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Recommendation Sensitivity
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-200">
          What would change the recommendation?
        </h3>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 rounded-lg border border-slate-700 bg-slate-700/60 px-4 py-4 text-sm leading-6 text-slate-300"
          >
            <span className="mt-2 h-2 w-2 rounded-full bg-violet-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WhatWouldChangeCard;

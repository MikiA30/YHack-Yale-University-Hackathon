function WhatWouldChangeCard({ items }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
          Recommendation Sensitivity
        </p>
        <h3 className="mt-2 text-xl font-semibold text-gray-900">
          What would change the recommendation?
        </h3>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-600"
          >
            <span className="mt-2 h-2 w-2 rounded-full bg-violet-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WhatWouldChangeCard;

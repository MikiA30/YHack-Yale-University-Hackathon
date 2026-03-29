import { modules } from "../modules";

function statusClasses(status) {
  if (status === "active") {
    return "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";
  }
  return "bg-amber-500/15 text-amber-200 border-amber-400/30";
}

function moduleAccent(moduleId) {
  if (moduleId === "omnicrop") {
    return {
      orb: "from-emerald-400 via-lime-300 to-emerald-500",
      button: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
      glow: "bg-emerald-500/20",
      icon: "field",
    };
  }

  return {
    orb: "from-violet-400 via-fuchsia-400 to-indigo-500",
    button: "bg-violet-500/15 text-violet-200 border-violet-400/30",
    glow: "bg-violet-500/20",
    icon: "grid",
  };
}

function ModuleIcon({ type }) {
  if (type === "field") {
    return (
      <svg
        className="h-6 w-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4 19h16M4 15c3-4 5-6 8-6s5 2 8 6M7 19V9m10 10v-7"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-6 w-6 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
      />
    </svg>
  );
}

export default function ModuleSelectionPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-8rem] h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        <section className="rounded-[2rem] border border-slate-800/80 bg-slate-900/70 px-8 py-10 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto max-w-5xl py-6 text-center">
            <h1 className="text-6xl font-semibold tracking-[-0.08em] text-white sm:text-7xl lg:text-8xl">
              A.U.R.A.
            </h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
              Adaptive Uncertainty & Risk Agent
            </p>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-400 sm:text-xl">
              A.U.R.A. is the shared platform. The convenience store module and
              the OmniCrop agriculture module both live under it.
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {modules.map((module) => (
            <a key={module.id} href={module.route} className="group block">
              {(() => {
                const accent = moduleAccent(module.id);
                return (
                  <article className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/85 p-7 transition duration-200 hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-900">
                    <div
                      className={`absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full blur-3xl ${accent.glow}`}
                    />

                    <div className="relative flex items-start justify-between gap-4">
                      <div className="space-y-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.orb}`}
                        >
                          <ModuleIcon type={accent.icon} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {module.category}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(module.status)}`}
                          >
                            {module.status === "active"
                              ? "Live Module"
                              : "Registered Module"}
                          </span>
                        </div>
                      </div>

                      <span className="text-sm font-semibold text-slate-500 transition group-hover:text-slate-300">
                        Open
                      </span>
                    </div>

                    <div className="relative mt-10 space-y-3">
                      <h2 className="text-3xl font-semibold tracking-tight text-white">
                        {module.name}
                      </h2>
                      <p className="max-w-xl text-sm leading-7 text-slate-400">
                        {module.description}
                      </p>
                    </div>

                    <div className="relative mt-8 flex items-center justify-between gap-4">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span
                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${accent.button}`}
                      >
                        Launch Module
                      </span>
                    </div>
                  </article>
                );
              })()}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

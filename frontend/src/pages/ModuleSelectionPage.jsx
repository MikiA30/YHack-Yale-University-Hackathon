import { modules } from "../modules";

function statusClasses(status) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function moduleAccent(moduleId) {
  if (moduleId === "omnicrop") {
    return {
      orb: "from-emerald-500 to-lime-500",
      button: "bg-emerald-50 text-emerald-700 border-emerald-200",
      glow: "bg-emerald-100",
      icon: "field",
    };
  }

  return {
    orb: "from-violet-500 to-indigo-500",
    button: "bg-violet-50 text-violet-700 border-violet-200",
    glow: "bg-violet-100",
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
    <div className="min-h-screen overflow-hidden bg-gray-50 text-gray-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-8rem] h-72 w-72 rounded-full bg-violet-100 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-emerald-100 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        <section className="rounded-[2rem] border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <div className="mx-auto max-w-5xl py-6 text-center">
            <h1 className="text-6xl font-semibold tracking-[-0.08em] text-gray-900 sm:text-7xl lg:text-8xl">
              A.U.R.A.
            </h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.32em] text-gray-400">
              Adaptive Uncertainty & Risk Agent
            </p>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-gray-500 sm:text-xl">
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
                  <article className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-md">
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
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
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

                      <span className="text-sm font-semibold text-gray-400 transition group-hover:text-gray-700">
                        Open
                      </span>
                    </div>

                    <div className="relative mt-10 space-y-3">
                      <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
                        {module.name}
                      </h2>
                      <p className="max-w-xl text-sm leading-7 text-gray-500">
                        {module.description}
                      </p>
                    </div>

                    <div className="relative mt-8 flex items-center justify-between gap-4">
                      <div className="h-px flex-1 bg-gray-200" />
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

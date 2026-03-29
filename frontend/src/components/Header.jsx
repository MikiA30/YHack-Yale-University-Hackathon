import { useLocation } from "react-router-dom";
import AuraLogo from "./AuraLogo";

const navLinks = [
  { path: "/modules/convenience-store", label: "Dashboard" },
  { path: "/modules/convenience-store/metrics", label: "Metrics" },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <AuraLogo size={28} />
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              A.U.R.A.
            </span>
            <span className="hidden sm:block text-xs text-gray-400 font-normal">
              Inventory Intelligence
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <a
                key={path}
                href={path}
                className={`
                  px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${
                    active
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/70"
                  }
                `}
              >
                {label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-xs text-gray-400">
            Module: Convenience Store
          </span>
          <a
            href="/"
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900"
          >
            Modules
          </a>
          <a
            href="/modules/omnicrop"
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900"
          >
            OmniCrop
          </a>
          <a
            href="/employee"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.97]"
          >
            Employee Mode
          </a>
        </div>
      </div>
    </header>
  );
}

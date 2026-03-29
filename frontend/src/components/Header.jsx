import { useLocation } from "react-router-dom";
import AuraLogo from "./AuraLogo";

const navLinks = [
  { path: "/", label: "Dashboard" },
  { path: "/metrics", label: "Metrics" },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Brand */}
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
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:block">
            Module: Convenience Store
          </span>
          <a
            href="/modules/convenience-store/metrics"
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Metrics
          </a>
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

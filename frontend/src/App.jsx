import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import LocationSettings from "./components/LocationSettings";
import PredictionCards from "./components/PredictionCards";
import InventoryTable from "./components/InventoryTable";
import AlertsBanner from "./components/AlertsBanner";
import ExplanationPanel from "./components/ExplanationPanel";
import SimulatorModal from "./components/SimulatorModal";
import NotificationInbox from "./components/NotificationInbox";
import AddProductPanel from "./components/AddProductPanel";
import ChatPanel from "./components/ChatPanel";
import ReportModal from "./components/ReportModal";

function App() {
  const [predictions, setPredictions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simItem, setSimItem] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportScrollTo, setReportScrollTo] = useState(null);

  const openReport = (scrollTo = null) => {
    setReportScrollTo(scrollTo);
    setReportOpen(true);
  };

  const refresh = useCallback(() => {
    Promise.all([
      fetch("/predict").then((r) => r.json()),
      fetch("/inventory").then((r) => r.json()),
      fetch("/alerts").then((r) => r.json()),
    ]).then(([predData, invData, alertData]) => {
      setPredictions(predData.predictions);
      setInventory(invData.inventory);
      setAlerts(alertData.alerts);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-poll every 3 seconds for live sync with employee page
  useEffect(() => {
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading A.U.R.A.…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Scan notifications */}
        <NotificationInbox />

        {/* Alerts */}
        {alerts.length > 0 && <AlertsBanner alerts={alerts} />}

        {/* Demand predictions */}
        <PredictionCards predictions={predictions} />

        {/* Inventory table */}
        <InventoryTable
          inventory={inventory}
          onSimulate={setSimItem}
          onRefresh={refresh}
        />

        {/* Bottom row: Add product + Location + Explanation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <AddProductPanel onRefresh={refresh} />
            <LocationSettings />
          </div>
          <div className="lg:col-span-2">
            <ExplanationPanel />
          </div>
        </div>
      </main>

      {simItem && (
        <SimulatorModal
          item={simItem}
          onClose={() => setSimItem(null)}
          onRefresh={refresh}
        />
      )}
      <ChatPanel onOpenReport={openReport} />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        scrollTo={reportScrollTo}
      />
    </div>
  );
}

export default App;

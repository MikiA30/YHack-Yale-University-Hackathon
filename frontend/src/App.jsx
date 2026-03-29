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

function App() {
  const [predictions, setPredictions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simItem, setSimItem] = useState(null);

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 text-lg">Loading predictions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        <NotificationInbox />
        {alerts.length > 0 && <AlertsBanner alerts={alerts} />}
        <PredictionCards predictions={predictions} />
        <InventoryTable
          inventory={inventory}
          onSimulate={setSimItem}
          onRefresh={refresh}
        />
        <AddProductPanel onRefresh={refresh} />
        <LocationSettings />
        <ExplanationPanel />
      </main>
      {simItem && (
        <SimulatorModal
          item={simItem}
          onClose={() => setSimItem(null)}
          onRefresh={refresh}
        />
      )}
      <ChatPanel />
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react'
import Header from './components/Header'
import PredictionCards from './components/PredictionCards'
import InventoryTable from './components/InventoryTable'
import ExplanationPanel from './components/ExplanationPanel'

function App() {
  const [predictions, setPredictions] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/predict').then(r => r.json()),
      fetch('/inventory').then(r => r.json()),
    ]).then(([predData, invData]) => {
      setPredictions(predData.predictions)
      setInventory(invData.inventory)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 text-lg">Loading predictions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        <PredictionCards predictions={predictions} />
        <InventoryTable inventory={inventory} />
        <ExplanationPanel />
      </main>
    </div>
  )
}

export default App

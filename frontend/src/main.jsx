import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import EmployeePage from "./pages/EmployeePage.jsx";
import ModuleSelectionPage from "./pages/ModuleSelectionPage.jsx";
import OmniCropPage from "./pages/OmniCropPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ModuleSelectionPage />} />
        <Route path="/modules/convenience-store" element={<App />} />
        <Route path="/modules/omnicrop" element={<OmniCropPage />} />
        <Route path="/employee" element={<EmployeePage />} />
        <Route
          path="/metrics"
          element={<Navigate to="/modules/convenience-store" replace />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

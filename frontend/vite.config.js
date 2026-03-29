import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      "/predict": "http://localhost:8000",
      "/inventory": "http://localhost:8000",
      "/explain": "http://localhost:8000",
      "/alerts": "http://localhost:8000",
      "/simulate": "http://localhost:8000",
      "/update_inventory": "http://localhost:8000",
      "/notify_scan": "http://localhost:8000",
      "/location": "http://localhost:8000",
      "/set_location": "http://localhost:8000",
      "/live_signals": "http://localhost:8000",
      "/report": "http://localhost:8000",
      "/financials": "http://localhost:8000",
      "/stockout_losses": "http://localhost:8000",
      "/eod_summary": "http://localhost:8000",
      "/notifications": "http://localhost:8000",
      "/dismiss_notification": "http://localhost:8000",
      "/add_product": "http://localhost:8000",
      "/remove_product": "http://localhost:8000",
      "/chat": "http://localhost:8000",
    },
  },
});

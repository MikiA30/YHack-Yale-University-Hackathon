// In production, VITE_API_URL points to the Render backend.
// In dev, it's empty so fetches go through the Vite proxy to localhost:8000.
const BASE = import.meta.env.VITE_API_URL || "";

export default function api(path, options) {
  return fetch(`${BASE}${path}`, options);
}

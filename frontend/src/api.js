/**
 * api.js
 * ------
 * Thin wrapper around the native fetch API.  Every function that calls a
 * protected endpoint attaches the JWT from localStorage.  No Axios — plain
 * fetch is sufficient for this project.
 */

const BASE = "/api";

/** Helper — builds headers with optional JWT. */
function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** POST /api/auth/login — returns { token, role }. */
export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Login failed");
  return res.json();
}

/** GET /api/sensor/wards — returns the latest reading per ward. */
export async function fetchWards() {
  const res = await fetch(`${BASE}/sensor/wards`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch wards");
  return res.json();
}

/** GET /api/recommend?ward=<name> — returns recommendation + top sources. */
export async function fetchRecommendation(ward) {
  const res = await fetch(
    `${BASE}/recommend?ward=${encodeURIComponent(ward)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Failed to fetch recommendation");
  return res.json();
}

/** POST /api/sensor/ingest — sends a sensor payload, returns AQI + sources. */
export async function ingestSensor(payload) {
  const res = await fetch(`${BASE}/sensor/ingest`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to ingest sensor data");
  return res.json();
}

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// StrictMode removed — it double-fires useEffect in dev mode, which
// doubled every API call (visible as duplicate /api/sensor/wards in Flask logs).
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../api";

export default function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function selectRole(newRole) {
    setRole(newRole);
    // Auto-fill test credentials for convenience
    if (newRole === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("citizen");
      setPassword("citizen123");
    }
  }

  async function handleSubmit() {
    setError("");
    try {
      const { token, role: returnedRole } = await loginUser(username, password);
      login(token);
      navigate(returnedRole === "admin" ? "/admin" : "/citizen");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-bg-glow"></div>
      <div className="login-card fade-in">
        <div className="login-logo">Airspirare</div>
        <div class="login-tagline">Hyper-Local AQI Intelligence · Delhi</div>

        <label className="login-form-label">Username</label>
        <input 
          className="login-input" 
          type="text" 
          placeholder="Enter your username" 
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <label className="login-form-label">Password</label>
        <input 
          className="login-input" 
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <label className="login-form-label" style={{ marginBottom: "10px" }}>Sign in as</label>
        <div className="role-toggle">
          <button 
            className={`role-btn admin ${role === "admin" ? "active" : ""}`} 
            onClick={() => selectRole('admin')}
          >
            <span className="role-emoji">🏛️</span>Administrator
          </button>
          <button 
            className={`role-btn citizen ${role === "citizen" ? "active" : ""}`} 
            onClick={() => selectRole('citizen')}
          >
            <span className="role-emoji">🏙️</span>Citizen
          </button>
        </div>

        {error && (
          <div className="alert-banner fade-in" style={{ marginBottom: "14px", padding: "8px 12px" }}>
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button className="login-btn" onClick={handleSubmit}>Sign In to Dashboard</button>
        <div className="login-footer">Mock credentials • admin / citizen roles available</div>
      </div>
    </div>
  );
}

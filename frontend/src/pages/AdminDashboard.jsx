import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchWards, fetchRecommendation, ingestSensor } from "../api";

// Helper for AQI styling based on the provided CSS logic
function aqiClass(aqi) {
  if (aqi <= 50)  return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-poor";
  if (aqi <= 200) return "aqi-vpoor";
  return "aqi-severe";
}
function aqiLabel(aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy SG";
  if (aqi <= 200) return "Unhealthy";
  return "Severe";
}
function aqiColor(aqi) {
  if (aqi <= 50)  return "var(--green)";
  if (aqi <= 100) return "var(--yellow)";
  if (aqi <= 150) return "var(--orange)";
  if (aqi <= 200) return "var(--red)";
  return "#f87171";
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [inferenceResult, setInferenceResult] = useState(null);

  // Form state for sensor ingestion
  const [sensorForm, setSensorForm] = useState({
    pm1_0: 15, pm2_5: 23, pm10: 30, temp: 31.7, hum: 63.4,
    pres: 1008.8, gas: 35102, co: 4.8, mq135: 225, lat: 28.6139, lng: 77.2090
  });

  useEffect(() => {
    fetchWards().then(setWards).catch(console.error);
    const t = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function handleGetPolicy() {
    if (!selectedWard) return;
    setRecLoading(true);
    try {
      const data = await fetchRecommendation(selectedWard.ward_name, "admin");
      setRecommendation(data.recommendation);
      setActiveTab("policy");
    } catch (e) {
      setRecommendation("Error fetching recommendations: " + e.message);
      setActiveTab("policy");
    }
    setRecLoading(false);
  }

  async function handleIngest() {
    try {
      const data = await ingestSensor({
        ward_name: selectedWard ? selectedWard.ward_name : "Test Ward", // defaults if none selected
        pm1_0: sensorForm.pm1_0,
        pm2_5: sensorForm.pm2_5,
        pm10: sensorForm.pm10,
        temperature_c: sensorForm.temp,
        humidity: sensorForm.hum,
        pressure: sensorForm.pres,
        gas_resistance: sensorForm.gas,
        co_ppm: sensorForm.co,
        mq135_air_quality: sensorForm.mq135,
        latitude: sensorForm.lat,
        longitude: sensorForm.lng
      });
      setInferenceResult(data);
      // refresh wards after ingest
      fetchWards().then(setWards).catch(console.error);
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  const tabTitles = { 
    overview: 'City Overview', wards: 'Ward Map', 
    sensor: 'Sensor Input', policy: 'Policy Recommendations', alerts: 'Active Alerts' 
  };

  // --- RENDERING HELPERS ---

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="logo-block">
        <div className="logo-wordmark">Airspirare</div>
        <div className="logo-tagline">AQI Command Center</div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Monitor</div>
        <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <span className="nav-icon">📊</span> Overview
        </div>
        <div className={`nav-item ${activeTab === 'wards' ? 'active' : ''}`} onClick={() => setActiveTab('wards')}>
          <span className="nav-icon">🗺️</span> Ward Map
        </div>
        <div className={`nav-item ${activeTab === 'sensor' ? 'active' : ''}`} onClick={() => setActiveTab('sensor')}>
          <span className="nav-icon">🎛️</span> Sensor Input
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Actions</div>
        <div className={`nav-item ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveTab('policy')}>
          <span className="nav-icon">📜</span> Policy Recs
        </div>
        <div className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <span className="nav-icon">🚨</span> Alerts
          <span style={{marginLeft:'auto',background:'var(--red)',color:'#fff',fontSize:'9px',padding:'1px 6px',borderRadius:'100px',fontFamily:'var(--font-mono)'}}>3</span>
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="user-card" onClick={logout}>
          <div className="user-avatar admin">{user?.username.charAt(0).toUpperCase()}A</div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">Administrator</div>
          </div>
          <button className="logout-btn" title="Logout">
            <span>🚪</span>
          </button>
        </div>
      </div>
    </aside>
  );

  const renderWardGrid = () => (
    <div className="ward-grid">
      {wards.map(w => {
        const isSelected = selectedWard?.ward_name === w.ward_name;
        return (
          <div 
            key={w.ward_name} 
            className={`ward-cell ${aqiClass(w.aqi)} ${isSelected ? 'selected' : ''}`}
            onClick={() => setSelectedWard(w)}
          >
            <div className="ward-name">{w.ward_name}</div>
            <div className="ward-aqi-val">{w.aqi}</div>
            <div className="ward-level">{aqiLabel(w.aqi)}</div>
            <div className="ward-updated">Live</div>
          </div>
        );
      })}
    </div>
  );

  const renderWardSidePanel = (w) => {
    if (!w) return (
      <div className="panel" style={{padding:'32px',textAlign:'center'}}>
        <div style={{fontSize:'36px',marginBottom:'12px'}}>🗺️</div>
        <div style={{fontFamily:'var(--font-disp)',fontWeight:700,color:'var(--text)',marginBottom:'6px'}}>Select a Ward</div>
        <div style={{fontSize:'12px',color:'var(--text2)'}}>Click any ward on the map to view detailed AQI data and pollutant source breakdown.</div>
      </div>
    );

    const sources = w.top_sources || {};
    // Sort sources high to low
    const sortedSources = Object.entries(sources)
      .sort((a,b) => b[1] - a[1])
      .map(([name, conf]) => ({ n: name, p: conf }));
    
    // Top 5 only
    const top5 = sortedSources.slice(0, 5);

    return (
      <div className="side-panel">
        <div className="aqi-detail fade-in">
          <div className="aqi-detail-header">
            <div className="aqi-detail-ward">{w.ward_name}</div>
            <div className="aqi-detail-coords">View Policy Recs →</div>
          </div>
          <div className="aqi-big-display">
            <div className="aqi-circle" style={{'--aqi-color': aqiColor(w.aqi), '--aqi-pct': `${Math.min(w.aqi/300*100,100).toFixed(0)}%`}}>
              <div className="aqi-circle-inner">
                <div className="aqi-big-num" style={{color: aqiColor(w.aqi)}}>{w.aqi}</div>
                <div className="aqi-unit">AQI</div>
              </div>
            </div>
            <div className="aqi-info">
              <div className="aqi-status-label" style={{color: aqiColor(w.aqi)}}>{aqiLabel(w.aqi)}</div>
              <div className="aqi-desc">
                {w.aqi > 150 ? 'Immediate action recommended.' : w.aqi > 100 ? 'Sensitive groups should take precautions.' : 'Air quality is acceptable.'}
              </div>
            </div>
          </div>
          <div className="sources-section">
            <div className="sources-title">Top Pollutant Sources</div>
            {top5.map((s, i) => (
              <div className="source-row" key={i}>
                <div className="source-meta">
                  <span className="source-name">{s.n}</span>
                  <span className="source-pct" style={{color: ['var(--red)','var(--orange)','var(--yellow)','var(--green)','#06b6d4'][i] || 'var(--text)'}}>{s.p}%</span>
                </div>
                <div className="source-bar-track">
                  <div className="source-bar-fill" style={{width: `${s.p}%`, background: ['var(--red)','var(--orange)','var(--yellow)','var(--green)','#06b6d4'][i] || 'var(--text)'}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="submit-btn" onClick={handleGetPolicy} disabled={recLoading}>
          {recLoading ? 'Generating...' : 'Run Policy AI for this Ward'}
        </button>
      </div>
    );
  };

  return (
    <div className="shell">
      {renderSidebar()}
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{tabTitles[activeTab]}</div>
            <div className="topbar-subtitle">Delhi · All Wards · Real-time Monitoring</div>
          </div>
          <div className="topbar-right">
            <div className="live-pill"><div className="live-dot"></div>LIVE</div>
            <div className="time-display">{timeStr}</div>
          </div>
        </div>

        <div className="content">
          
          {/* TAB: OVERVIEW */}
          <div className={`view ${activeTab === 'overview' ? 'active' : ''}`}>
            <div className="stat-row fade-in">
              <div className="stat-card blue">
                <div className="stat-label">Wards Monitored</div>
                <div className="stat-value">{wards.length}</div>
                <div className="stat-sub">All sensors active</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">City Avg AQI</div>
                <div className="stat-value">{wards.length ? Math.round(wards.reduce((a,b)=>a+b.aqi,0)/wards.length) : 0}</div>
                <div className="stat-sub" style={{color:'var(--orange)'}}>Current Average</div>
              </div>
            </div>
            <div className="two-col fade-in">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Delhi Ward Map</div>
                  <div className="panel-badge blue">{wards.length} WARDS</div>
                </div>
                {renderWardGrid()}
              </div>
              {renderWardSidePanel(selectedWard)}
            </div>
          </div>

          {/* TAB: WARDS */}
          <div className={`view ${activeTab === 'wards' ? 'active' : ''}`}>
            <div className="two-col">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Ward Map — Full View</div>
                  <div className="panel-badge blue">INTERACTIVE</div>
                </div>
                {renderWardGrid()}
              </div>
              {renderWardSidePanel(selectedWard)}
            </div>
          </div>

          {/* TAB: SENSOR */}
          <div className={`view ${activeTab === 'sensor' ? 'active' : ''}`}>
             <div className="two-col">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Manual Sensor Input</div>
                  <div className="panel-badge blue">INGEST</div>
                </div>
                <div className="input-form">
                  <div className="input-group-label">Ward Override</div>
                    <input 
                      className="input-field" 
                      value={selectedWard?.ward_name || "Select ward from map"} 
                      disabled 
                    />

                    {/* Comprehensive 11-field form mapped to sensorForm state */}
                    <div className="input-group-label" style={{marginTop:'12px'}}>Particulate Matter</div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">PM1.0</span><input className="input-field" type="number" value={sensorForm.pm1_0} onChange={e=>setSensorForm({...sensorForm, pm1_0: +e.target.value})} /></label>
                      <label className="input-field-wrap"><span className="input-label">PM2.5</span><input className="input-field" type="number" value={sensorForm.pm2_5} onChange={e=>setSensorForm({...sensorForm, pm2_5: +e.target.value})} /></label>
                    </div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">PM10</span><input className="input-field" type="number" value={sensorForm.pm10} onChange={e=>setSensorForm({...sensorForm, pm10: +e.target.value})} /></label>
                    </div>

                    <div className="input-group-label" style={{marginTop:'12px'}}>Environmental</div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">Temp (°C)</span><input className="input-field" type="number" value={sensorForm.temp} onChange={e=>setSensorForm({...sensorForm, temp: +e.target.value})} /></label>
                      <label className="input-field-wrap"><span className="input-label">Humidity (%)</span><input className="input-field" type="number" value={sensorForm.hum} onChange={e=>setSensorForm({...sensorForm, hum: +e.target.value})} /></label>
                    </div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">Pressure (hPa)</span><input className="input-field" type="number" value={sensorForm.pres} onChange={e=>setSensorForm({...sensorForm, pres: +e.target.value})} /></label>
                      <label className="input-field-wrap"><span className="input-label">Gas Resistance</span><input className="input-field" type="number" value={sensorForm.gas} onChange={e=>setSensorForm({...sensorForm, gas: +e.target.value})} /></label>
                    </div>

                    <div className="input-group-label" style={{marginTop:'12px'}}>Gas Sensors</div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">CO ppm</span><input className="input-field" type="number" value={sensorForm.co} onChange={e=>setSensorForm({...sensorForm, co: +e.target.value})} /></label>
                      <label className="input-field-wrap"><span className="input-label">MQ135 Gas</span><input className="input-field" type="number" value={sensorForm.mq135} onChange={e=>setSensorForm({...sensorForm, mq135: +e.target.value})} /></label>
                    </div>

                    <div className="input-group-label" style={{marginTop:'12px'}}>Location</div>
                    <div className="input-row">
                      <label className="input-field-wrap"><span className="input-label">Latitude</span><input className="input-field" type="number" value={sensorForm.lat} onChange={e=>setSensorForm({...sensorForm, lat: +e.target.value})} /></label>
                      <label className="input-field-wrap"><span className="input-label">Longitude</span><input className="input-field" type="number" value={sensorForm.lng} onChange={e=>setSensorForm({...sensorForm, lng: +e.target.value})} /></label>
                    </div>

                    <button className="submit-btn" style={{marginTop:'16px'}} onClick={handleIngest}>▶ Run Inference & Ingest</button>
                </div>
              </div>

              {inferenceResult && (
                <div className="side-panel">
                  <div className="aqi-detail fade-in">
                    <div className="aqi-detail-header">
                      <div className="aqi-detail-ward">Inference Result</div>
                      <div className="aqi-detail-coords">Saved successfully!</div>
                    </div>
                    <div className="aqi-big-display">
                      <div className="aqi-big-num" style={{color: aqiColor(inferenceResult.aqi)}}>{inferenceResult.aqi} AQI</div>
                    </div>
                  </div>
                </div>
              )}
             </div>
          </div>

          {/* TAB: POLICY */}
          <div className={`view ${activeTab === 'policy' ? 'active' : ''}`}>
            {!recommendation ? (
               <div className="alert-banner" style={{borderColor:'rgba(59,139,255,0.25)',background:'rgba(59,139,255,0.08)',color:'#93c5fd'}}>
                 <span className="alert-icon">ℹ️</span>
                 <span>Select a ward from the Ward Map tab and run the AI policy generator.</span>
               </div>
            ) : (
              <div className="rec-card admin fade-in" style={{maxWidth: '800px', margin:'0 auto'}}>
                <div className="rec-card-header">
                  <span className="rec-icon">🏛️</span>
                  <span className="rec-card-title">Policy Recommendations — {selectedWard?.ward_name}</span>
                </div>
                <div className="rec-body whitespace-pre-wrap text-sm text-slate-300">
                  {recommendation}
                </div>
              </div>
            )}
          </div>

          {/* TAB: ALERTS */}
          <div className={`view ${activeTab === 'alerts' ? 'active' : ''}`}>
            <div className="panel" style={{maxWidth:'700px'}}>
              <div className="panel-header">
                <div className="panel-title">Active Alerts</div>
              </div>
              <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:'10px',padding:'14px 16px', color:'var(--text)'}}>
                   Mock Alert: No critical spikes in the last hour.
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

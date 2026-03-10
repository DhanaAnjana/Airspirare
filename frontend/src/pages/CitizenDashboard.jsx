import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchWards, fetchRecommendation } from "../api";

// Helpers
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

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [timeStr, setTimeStr] = useState("--:--:--");
  const [wards, setWards] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [myWard, setMyWard] = useState(null);
  const [advisory, setAdvisory] = useState("");
  const [advLoading, setAdvLoading] = useState(false);

  useEffect(() => {
    fetchWards().then(setWards).catch(console.error);
    const t = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    const w = wards.find(x => x.ward_name.toLowerCase().includes(q));
    if (w) setMyWard(w);
  }

  async function handleGetAdvisory() {
    if (!myWard) return;
    setAdvLoading(true);
    try {
      const data = await fetchRecommendation(myWard.ward_name, "citizen");
      setAdvisory(data.recommendation);
      setActiveTab("advisory");
    } catch (e) {
      setAdvisory("Error fetching advisory: " + e.message);
      setActiveTab("advisory");
    }
    setAdvLoading(false);
  }

  const tabTitles = { 
    home: 'My Location — Air Quality', advisory: 'Health Advisory', 
    allwards: 'All Wards', tips: 'Protection Tips' 
  };

  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="logo-block">
        <div className="logo-wordmark">Airspirare</div>
        <div className="logo-tagline">Your Air Quality Guide</div>
      </div>
      <div className="nav-section">
        <div className="nav-label">My Air</div>
        <div className={`nav-item ${activeTab==='home'?'active':''}`} onClick={()=>setActiveTab('home')}>
          <span className="nav-icon">📍</span> My Location
        </div>
        <div className={`nav-item ${activeTab==='advisory'?'active':''}`} onClick={()=>setActiveTab('advisory')}>
          <span className="nav-icon">💚</span> Health Advisory
        </div>
        <div className={`nav-item ${activeTab==='allwards'?'active':''}`} onClick={()=>setActiveTab('allwards')}>
          <span className="nav-icon">🗺️</span> All Wards
        </div>
        <div className={`nav-item ${activeTab==='tips'?'active':''}`} onClick={()=>setActiveTab('tips')}>
          <span className="nav-icon">🛡️</span> Protection Tips
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="user-card" onClick={logout}>
          <div className="user-avatar citizen">{user?.username.charAt(0).toUpperCase()}C</div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">Citizen</div>
          </div>
          <button className="logout-btn" title="Logout"><span>🚪</span></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="shell">
      {renderSidebar()}
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{tabTitles[activeTab]}</div>
            <div className="topbar-subtitle">Delhi · Citizen Dashboard · Personal Advisory</div>
          </div>
          <div className="topbar-right">
            <div className="live-pill"><div className="live-dot"></div>LIVE</div>
            <div className="time-display">{timeStr}</div>
          </div>
        </div>

        <div className="content">

          {/* TAB: HOME */}
          <div className={`view ${activeTab === 'home' ? 'active' : ''}`}>
            <div className="citizen-search fade-in">
              <div className="search-label">Check Your Ward's Air Quality</div>
              <div className="search-sublabel">Enter your ward name (e.g. Karol Bagh, Dwarka)</div>
              <div className="search-row">
                <input 
                  className="search-input" 
                  type="text" 
                  placeholder="Ward name..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="search-btn" onClick={handleSearch}>Check AQI</button>
              </div>
            </div>

            {myWard ? (
              <div className="citizen-grid fade-in fade-in-d1">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">{myWard.ward_name}</div>
                    <div className="panel-badge orange">{aqiLabel(myWard.aqi).toUpperCase()}</div>
                  </div>
                  <div className="aqi-big-display">
                    <div className="aqi-circle" style={{'--aqi-color':aqiColor(myWard.aqi),'--aqi-pct':`${Math.min(myWard.aqi/300*100,100).toFixed(0)}%`}}>
                      <div className="aqi-circle-inner">
                        <div className="aqi-big-num" style={{color:aqiColor(myWard.aqi)}}>{myWard.aqi}</div>
                        <div className="aqi-unit">AQI</div>
                      </div>
                    </div>
                    <div className="aqi-info">
                      <div className="aqi-status-label" style={{color:aqiColor(myWard.aqi)}}>{aqiLabel(myWard.aqi)}</div>
                      <div className="aqi-desc">
                        {myWard.aqi > 150 ? 'Avoid outdoor activities.' : 'Sensitive individuals should limit prolonged exertion.'}
                      </div>
                    </div>
                  </div>
                  <div className="health-meter">
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'2px',textTransform:'uppercase'}}>AQI Scale</div>
                    <div className="health-track">
                      <div className="health-cursor" style={{left:`${Math.min(myWard.aqi/300*100, 96)}%`}}></div>
                    </div>
                    <div className="health-labels">
                      <span className="health-lbl">0</span>
                      <span className="health-lbl">50</span>
                      <span className="health-lbl">100</span>
                      <span class="health-lbl">150</span>
                      <span className="health-lbl">200</span>
                      <span className="health-lbl">300+</span>
                    </div>
                    
                    <button className="submit-btn" style={{marginTop:'16px'}} onClick={handleGetAdvisory} disabled={advLoading}>
                      {advLoading ? 'Loading...' : 'Get Personalized Health Advisory'}
                    </button>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">Pollution Sources</div>
                    <div className="panel-badge orange">TOP 5</div>
                  </div>
                  <div className="sources-section">
                    <div className="sources-title">Confidence %</div>
                    {Object.entries(myWard.top_sources || {}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n, p], i) => (
                      <div className="source-row" key={i}>
                        <div className="source-meta">
                          <span className="source-name">{n}</span>
                          <span className="source-pct" style={{color:['var(--red)','var(--orange)','var(--yellow)','var(--green)','#06b6d4'][i]||'#fff'}}>{p}%</span>
                        </div>
                        <div className="source-bar-track">
                          <div className="source-bar-fill" style={{width:`${p}%`,background:['var(--red)','var(--orange)','var(--yellow)','var(--green)','#06b6d4'][i]||'#fff'}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
               <div style={{textAlign:'center', marginTop:'40px', color:'var(--text2)'}}>
                 Search for a ward above to see your hyper-local air quality.
               </div>
            )}
          </div>

          {/* TAB: ADVISORY */}
          <div className={`view ${activeTab === 'advisory' ? 'active' : ''}`}>
            {!advisory ? (
               <div className="alert-banner" style={{borderColor:'rgba(34,197,94,0.25)',background:'rgba(34,197,94,0.08)',color:'#86efac'}}>
                 <span className="alert-icon">ℹ️</span>
                 <span>Select your ward in "My Location" first, then generate a personalized health advisory.</span>
               </div>
            ) : (
              <div style={{maxWidth:'680px'}}>
                <div className="rec-card citizen fade-in" style={{marginBottom:'18px'}}>
                  <div className="rec-card-header">
                    <span className="rec-icon">💚</span>
                    <span className="rec-card-title">Health Advisory — {myWard?.ward_name}</span>
                  </div>
                  <div className="rec-body whitespace-pre-wrap text-sm text-slate-300">
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'9px',color:'var(--text3)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'12px'}}>
                      Powered by Gemini AI · Based on local pollutants
                    </div>
                    {advisory}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TAB: ALL WARDS */}
          <div className={`view ${activeTab === 'allwards' ? 'active' : ''}`}>
             <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">All Delhi Wards — Live AQI</div>
                  <div className="panel-badge blue">{wards.length} WARDS</div>
                </div>
                <div className="ward-grid">
                  {wards.map(w => (
                    <div key={w.ward_name} className={`ward-cell ${aqiClass(w.aqi)}`} onClick={() => { setMyWard(w); setActiveTab('home'); }}>
                      <div className="ward-name">{w.ward_name}</div>
                      <div className="ward-aqi-val">{w.aqi}</div>
                      <div className="ward-level">{aqiLabel(w.aqi)}</div>
                      <div className="ward-updated">Live</div>
                    </div>
                  ))}
                </div>
              </div>
          </div>

          {/* TAB: TIPS */}
          <div className={`view ${activeTab === 'tips' ? 'active' : ''}`}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',maxWidth:'800px'}}>
              <div className="panel">
                <div className="panel-header"><div className="panel-title">🏠 At Home</div></div>
                <div className="panel-body">
                  <ul className="list-disc pl-4 text-xs text-slate-300 space-y-2">
                    <li>Use HEPA air purifiers in bedrooms.</li>
                    <li>Avoid burning incense or candles.</li>
                    <li>Seal gaps around doors and windows.</li>
                  </ul>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header"><div className="panel-title">🚶 Outdoors</div></div>
                <div className="panel-body">
                  <ul className="list-disc pl-4 text-xs text-slate-300 space-y-2">
                    <li>Exercise outdoors only when AQI &lt; 100.</li>
                    <li>N95 masks filter effectively — ensure tight seal.</li>
                    <li>Avoid high-traffic roads and industrial areas.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

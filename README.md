# 🌬️ Airspirare
### Hyper-Local AQI Intelligence for Delhi — Ward by Ward

> *"Airspirare" — from Latin, "to breathe"*
> *Aspiring for a pollution free environment*

---

## 🧭 What Is This?

**Airspirare** is a hyper-local air quality detection and recommendation system built for Delhi. It doesn't just report the city's AQI as a single number — it breaks pollution down **ward by ward**, identifies the **sources driving it**, and delivers **role-specific guidance** to the people who can actually act on it: city administrators who set policy, and citizens who need to protect their health.

The system ingests real sensor readings from the field, processes them through a machine learning model, and uses the **Gemini AI API** to translate raw pollution data into clear, actionable language — instantly, and tailored to who is asking.

---

## 🏗️ System Architecture

The system is built as a clean **four-layer pipeline**. Each layer has a single job and is independently replaceable as the system scales.

```
🔌 IoT Sensors
      ↓  HTTP POST (JSON payload)
🐍 Flask Backend  ←→  🗄️ SQLite Database
      ↓  ML Inference
🧠 ML Model  →  AQI Value + 15 Source Confidence Scores
      ↓  Top 5 Sources + Role
✨ Gemini API  →  Policy Recommendation or Health Advisory
      ↓
⚛️  React Frontend  →  Admin Dashboard  |  Citizen Dashboard
```

---

## 📡 The Sensor Layer

Each IoT sensor node deployed across Delhi wards transmits the following payload to the Flask ingestion endpoint:

```json
{
  "pm1_0": 15,
  "pm2_5": 23,
  "pm10": 30,
  "temperature_c": 31.7,
  "humidity": 63.4,
  "pressure": 1008.8,
  "gas_resistance": 35102,
  "co_ppm": 4.8,
  "mq135_air_quality": 225,
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

The payload covers **particulate matter** (PM1.0, PM2.5, PM10), **meteorological conditions** (temperature, humidity, atmospheric pressure), a **VOC and gas resistance reading** from a BME680-type sensor, **carbon monoxide concentration** from a dedicated CO sensor, a **composite air quality index** from an MQ135 sensor, and the **GPS coordinates** of the sensor node — which are used to resolve the reading to its corresponding ward.

Every field is validated at the Flask ingestion endpoint before any processing occurs. Type checks, null checks, and range validation all run first. A malformed payload is rejected with a descriptive 400 error that names the failing field, making field-level debugging straightforward.

---

## 🧠 The Machine Learning Layer

The ML model sits at the heart of the backend. It accepts the 11-field sensor vector and produces two outputs that drive everything downstream.

**Output 1 — AQI Value 🔢** is a single continuous numeric score representing overall air quality at that ward at that moment. Standard AQI breakpoints apply:

| Range | Level | Meaning |
|---|---|---|
| 0 – 50 | 🟢 Good | Air quality is satisfactory |
| 51 – 100 | 🟡 Moderate | Acceptable; sensitive groups should be cautious |
| 101 – 150 | 🟠 Unhealthy for Sensitive Groups | Elderly, children, and respiratory patients at risk |
| 151 – 200 | 🔴 Unhealthy | Everyone may begin to experience health effects |
| 201 – 300 | 🟣 Very Unhealthy | Health alert — serious effects for everyone |
| 300+ | ⚫ Hazardous | Emergency conditions |

**Output 2 — Source Confidence Scores 🎯** is the more analytically powerful output. Rather than returning a single source label, the model returns a **confidence percentage for all 15 possible pollution sources**, summing to exactly 100%. The 15 sources the model classifies against are: Traffic Emissions, Construction Dust, Industrial Emissions, Biomass Burning, Crop Residue Burning, Waste Burning, Diesel Generators, Road Dust, Coal Combustion, Chemical Plants, Brick Kilns, Firecrackers, Paint and Solvent Fumes, Garbage Dumps, and Power Plants.

A typical output looks like this:

```
Traffic Emissions      → 41%  ████████████████████
Construction Dust      → 24%  ████████████
Industrial Emissions   → 14%  ███████
Road Dust              → 11%  █████
Diesel Generators      →  6%  ███
... (remaining 10 sources share the rest)
```

The model is loaded **once at Flask startup** using `joblib` and held in memory, keeping per-request inference time in the low millisecond range. The same scaler used during training is applied to the input vector before inference — this is critical for model accuracy and is handled automatically at every call.

---

## ✨ The Gemini Integration

Once the ML model produces its output, the **top 5 sources by confidence score** are extracted and passed to the Gemini API. This is where raw numbers become human language.

The system uses **two distinct prompt templates** depending on who is asking.

The **Admin Prompt 🏛️** instructs Gemini to act as an environmental policy advisor. It receives the ward name, AQI value, and the top 5 sources with their confidence percentages, and returns 3–5 specific, operational policy interventions — things like traffic restriction zones, construction halt orders, or industrial compliance checks — that are grounded in the actual pollution profile of that ward at that moment.

The **Citizen Prompt 🏙️** instructs Gemini to act as a public health advisor. It receives the same data and returns 3–5 plain-language health advisories — practical guidance about masks, outdoor activity, window ventilation, and when to seek medical attention — written for a general audience without technical jargon.

Passing the top 5 sources (rather than a single label) is intentional: Gemini generates far more nuanced and specific recommendations when it knows that 41% of pollution in Shahdara right now is from traffic *while* 24% is simultaneously from construction dust, rather than just being told "the source is traffic."

Gemini responses are **cached in memory** keyed by `(ward_id, top_5_sources, role)` to avoid redundant API calls when the pollution profile hasn't changed between requests.

---

## 🔐 Authentication and Role-Based Access

The system enforces **JWT-based role authentication** with two distinct roles. Every token is signed with the server's `SECRET_KEY`, carries the user's ID, username, and role, and expires after 24 hours.

**Administrators 👨‍💼** can access the ward map overview, full sensor readings for every ward, the manual sensor input panel for triggering on-demand inference, and Gemini-generated policy recommendations. Admin routes on the Flask backend are protected by a `@require_role('admin')` decorator that validates the token on every single request.

**Citizens 👤** can look up their ward's current AQI, view the top pollution sources, and request Gemini-generated health advisories. Citizen routes are similarly protected by `@require_role('citizen')`.

Role enforcement happens at **two independent layers** — the React frontend redirects wrong-role users before they see anything, and the Flask backend validates every token independently. This means the protection holds even if someone bypasses the frontend and makes direct API calls.

---

## 🗄️ Data Model

The SQLite database (swappable to PostgreSQL via a single `DATABASE_URL` environment variable) contains exactly two tables.

The **`users`** table stores user ID, username, hashed password (via werkzeug), and role. The **`ward_readings`** table stores ward ID, AQI value, the full JSON blob of all 15 source confidence scores, a timestamp, and all 11 raw sensor feature values. The latest reading per ward is what the admin map displays; historical readings are preserved for trend analysis.

---

## ⚛️ Frontend Structure

The React frontend (built with Vite) delivers two completely separate dashboard experiences that share only the authentication context and the Axios API wrapper.

**Admin Dashboard 🏛️** has five views: a city overview with aggregated stats and the interactive ward map; a full ward map where clicking any ward loads its AQI detail, sensor data, and source breakdown in a side panel; a manual sensor input form for on-demand inference; a policy recommendations view; and an active alerts panel. The ward map uses CSS colour coding — green, yellow, orange, red, dark red — with text labels alongside so colour is never the only signal.

**Citizen Dashboard 🏙️** has four views: a personal location view with AQI display, a health scale indicator, and source breakdown; a health advisory view with the Gemini response rendered as structured guidance; an all-wards comparison map; and a protection tips reference page. Citizens interact simply by typing their ward name into a search field.

The Axios instance in `src/api.js` attaches the JWT Authorization header to every request via a request interceptor, so no individual component needs to handle authentication headers directly.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| 🖥️ Frontend | React 18 + Vite | Role-based dual dashboard |
| 🎨 Styling | Tailwind CSS | Utility-first responsive design |
| 🔀 Routing | React Router v6 | Protected route enforcement |
| 🌐 HTTP | Axios | JWT-intercepted API calls |
| 🐍 Backend | Flask + Flask-CORS | REST API server |
| 🔑 Auth | Flask-JWT-Extended | Token issuance and validation |
| 🧠 ML | scikit-learn + joblib | AQI inference and source classification |
| ✨ AI | Google Gemini API | Natural language recommendations |
| 🗄️ Database | SQLite / PostgreSQL | Ward readings and user storage |
| 🔧 ORM | SQLAlchemy | Database abstraction layer |
| ⚙️ Config | python-dotenv | Environment variable management |
| 🚀 WSGI | Gunicorn | Production Flask server |

---

## 🚀 Getting Started

**Prerequisites:** Python 3.10+, Node.js 18+, a Gemini API key from [Google AI Studio](https://aistudio.google.com).

**Backend setup:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Fill in GEMINI_API_KEY and SECRET_KEY
python seed.py                 # Creates tables and seeds ward data
python run.py                  # Starts Flask on port 5000
```

**Frontend setup:**
```bash
cd frontend
npm install
npm run dev                    # Starts Vite on port 5173
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies all `/api` requests to Flask on port 5000, so there are no CORS issues in development.

---

## 📁 Project Structure

```
Airspirare/
├── backend/
│   ├── routes/
│   │   ├── auth.py           # 🔑 Login and register endpoints
│   │   ├── sensor.py         # 📡 Ingest payload, return ward readings
│   │   └── recommend.py      # ✨ Gemini recommendation endpoint
│   ├── app.py                # 🏭 Flask app factory
│   ├── models.py             # 🗄️ User and WardReading tables
│   ├── config.py             # ⚙️ Environment config loader
│   ├── mock_model.py         # 🧠 ML inference (AQI + 15 source scores)
│   ├── gemini_service.py     # ✨ Gemini API client and response cache
│   ├── seed.py               # 🌱 Database init and initial data
│   └── requirements.txt      # 📦 Python dependencies
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx    # 🔐 Global auth state
    │   ├── pages/
    │   │   ├── Login.jsx          # 🚪 Role-based login
    │   │   ├── AdminDashboard.jsx # 🏛️ Admin views
    │   │   └── CitizenDashboard.jsx # 🏙️ Citizen views
    │   └── api.js                # 🌐 Fetch wrapper with JWT
    ├── vite.config.js            # 🔀 API proxy to Flask
    └── tailwind.config.js        # 🎨 Tailwind setup
```

---

## 🌱 Environment Variables

Create `backend/.env` from `backend/.env.example` and fill in these three values:

```
SECRET_KEY=your_jwt_signing_secret_here
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=sqlite:///airspirare.db
```

---

## 🗺️ API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Returns JWT token |
| `POST` | `/api/auth/register` | Public | Creates a new user |
| `POST` | `/api/sensor/ingest` | Sensor Key | Ingests payload, runs inference, stores result |
| `GET` | `/api/sensor/wards` | Any JWT | Latest reading for all wards |
| `GET` | `/api/recommend` | Any JWT | Gemini recommendation for a ward and role |

---

## 💡 Design Decisions Worth Knowing

**Why 15 sources instead of 1? 🎯** A single source label loses information. Knowing that a ward's pollution is 41% traffic and 24% construction simultaneously produces far richer Gemini recommendations than knowing only "the source is traffic." The confidence distribution is the signal.

**Why pass only the top 5 to Gemini? ✂️** Sending all 15 sources adds noise and token cost without meaningfully improving recommendations. The bottom 10 sources typically each hold under 3% confidence and represent negligible contributors at that moment. The top 5 capture the actionable picture.

**Why is the ML model loaded at startup, not per-request? ⚡** Loading a scikit-learn model from disk takes 0.5–2 seconds. Loading it on every inference request would make the API unusable under any real sensor load. Module-level globals are the correct pattern here.

**Why SQLite in development? 🗄️** Zero setup, zero configuration, works everywhere. The SQLAlchemy ORM means the exact same query code runs against PostgreSQL in production — you change one environment variable and nothing else in the codebase changes.

---

*Built for Delhi. Designed to breathe. 🌿*

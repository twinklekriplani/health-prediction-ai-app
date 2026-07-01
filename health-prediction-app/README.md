# MIRA | Medical Intelligence Robotic Automation

MIRA is an intelligent health prediction and management dashboard built to automate patient clinical records tracking and evaluate cardiovascular/metabolic risks using a hybrid diagnostic engine (Local Clinical Matrix & Optional Cloud LLM). 

This project was built for the **Junior AI/ML Developer** role assessment task.

---

## 🌟 Key Features

1. **Full CRUD Operations**: Create, read, update, and delete patient records with automatic updates to statistical aggregations.
2. **Unified Architecture**: FastAPI (Python) backend serving a premium HTML5, Vanilla JavaScript, and Custom CSS single-page frontend.
3. **Robust Data Validation**:
   - Schema enforcement via **Pydantic**.
   - Input format validation (e.g., email syntax, positive numeric boundaries for laboratory measurements).
   - Date restriction (ensures the Date of Birth cannot be in the future).
4. **Persistent Storage**: Utilizes a local SQLite database file (`mira_health.db`) with automatic table creation upon initial startup.
5. **AI/ML Health Integration (Dual-Mode)**:
   - **Local Clinical Decision Matrix**: Instantly evaluates vital parameters (Glucose, Haemoglobin, Cholesterol) based on established clinical benchmarks. Generates categorized risk levels (Low, Moderate, High), patient conditions, and diet/lifestyle recommendations.
   - **Cloud LLM Integration**: Detects environment variables (`GEMINI_API_KEY` or `OPENAI_API_KEY`) and upgrades automatically to call cloud AI services. Returns detailed, personalized reports matching the local schema.
6. **Premium Responsive UI/UX**:
   - Modern dark design using CSS custom properties (variables), glassmorphic backdrops, smooth slide-out drawers, and micro-animations.
   - Dynamic patient data tables with real-time text searching and row details view.
   - Interactive charts utilizing **Chart.js** displaying individual patient vitals against normal clinical thresholds, alongside active dashboard metrics.
   - Client-side error-boundary reporting and toast notification alerts.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.10+, FastAPI, SQLite, SQLAlchemy, Pydantic v2
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Custom CSS, Chart.js, Lucide Icons
* **Dev/Deployment**: Uvicorn, Python-dotenv

---

## 📂 Project Structure

```text
health-prediction-app/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI server entrypoint (defines REST API & static mount)
│   ├── database.py          # SQLite connection and session initialization
│   ├── models.py            # SQLAlchemy schema for patient table
│   ├── schemas.py           # Pydantic schemas validating input/response fields
│   ├── crud.py              # Low-level DB SQL transactions
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── predictor.py     # Router for local clinical matrix & external API fallback
│   │   └── api_client.py    # Request handler for Gemini and OpenAI APIs
│   └── static/
│       ├── index.html       # HTML5 structure (Lucide, Chart.js integrations)
│       ├── css/
│       │   └── style.css    # Premium glassmorphic custom CSS styling
│       └── js/
│           └── app.js       # Client state engine, AJAX calls, charts, validation rules
├── requirements.txt         # Project dependencies list
├── .env.example             # Template for API keys
├── .env                     # Local configuration parameters (ignored in Git)
├── mira_health.db           # SQLite Database file (created on runtime)
├── README.md                # General documentation
└── run.py                   # Development server launcher
```

---

## 🚀 Setup & Installation Instructions

Follow these simple steps to run the application locally on your computer:

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd health-prediction-app
```

### 2. Set up a virtual environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Optional: Configure Cloud AI Keys
By default, MIRA functions **fully out-of-the-box** using a local decision engine. If you would like to test cloud AI-generated remarks:
1. Copy `.env.example` to a new file named `.env`:
   ```bash
   copy .env.example .env
   ```
2. Open `.env` and fill in your keys:
   - `GEMINI_API_KEY` (Gemini API)
   - OR `OPENAI_API_KEY` (OpenAI API)

### 5. Launch the Application
Run the launcher script:
```bash
python run.py
```

The application will start, build the database tables, and run the server at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧪 API Documentation

Once the server is running, you can explore the automatically generated OpenAPI Interactive Docs:
* Swagger UI: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
* Redoc: **[http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)**

### Available Endpoints
| HTTP Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and API configurations |
| `GET` | `/api/patients` | Retrieve all patient files (supports `?search=query` filter) |
| `GET` | `/api/patients/{id}` | Read detailed clinical files for a single patient |
| `POST`| `/api/patients` | Record a new patient file, execute AI remarks, and save |
| `PUT` | `/api/patients/{id}` | Update existing details and recalculate AI remarks |
| `DELETE`| `/api/patients/{id}` | Permanently delete a patient record |

---

## 📈 Health Vitals Reference Ranges

MIRA evaluates clinical markers against standard reference limits:
* **Fasting Glucose**:
  * `< 70 mg/dL`: Hypoglycemia (Low Blood Sugar)
  * `70 - 100 mg/dL`: Normal
  * `101 - 125 mg/dL`: Impaired (Prediabetes)
  * `≥ 126 mg/dL`: Hyperglycemia (Possible Diabetes)
* **Haemoglobin**:
  * `< 12.0 g/dL`: Anemia
  * `12.0 - 17.5 g/dL`: Normal
  * `> 17.5 g/dL`: Erythrocytosis (High Haemoglobin)
* **Total Cholesterol**:
  * `< 200 mg/dL`: Optimal
  * `200 - 239 mg/dL`: Borderline High
  * `≥ 240 mg/dL`: Hypercholesterolemia (High Cholesterol)

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app import models, schemas, crud
from app.database import engine, get_db
from app.engine.predictor import generate_patient_remarks

# Create database tables
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check if database needs seeding on startup
    db = next(get_db())
    try:
        existing_count = db.query(models.Patient).count()
        if existing_count == 0:
            print("Database is empty. Seeding mock patient data for MIRA evaluation...")
            mock_patients = [
                {
                    "name": "Sarah Jenkins",
                    "email": "sarah.j@example.com",
                    "dob": "1998-03-12",
                    "glucose": 88.0,
                    "haemoglobin": 14.2,
                    "cholesterol": 175.0
                },
                {
                    "name": "Marcus Vance",
                    "email": "marcus.v@example.com",
                    "dob": "1972-11-04",
                    "glucose": 135.0,
                    "haemoglobin": 15.1,
                    "cholesterol": 242.0
                },
                {
                    "name": "Elena Rostova",
                    "email": "elena.r@example.com",
                    "dob": "1993-07-19",
                    "glucose": 92.0,
                    "haemoglobin": 10.5,
                    "cholesterol": 190.0
                },
                {
                    "name": "David Chen",
                    "email": "david.c@example.com",
                    "dob": "1981-01-30",
                    "glucose": 108.0,
                    "haemoglobin": 16.2,
                    "cholesterol": 215.0
                },
                {
                    "name": "Sophia Martinez",
                    "email": "sophia.m@example.com",
                    "dob": "1964-09-15",
                    "glucose": 64.0,
                    "haemoglobin": 13.5,
                    "cholesterol": 185.0
                }
            ]
            from datetime import datetime
            for p in mock_patients:
                remarks = generate_patient_remarks(
                    name=p["name"],
                    dob=p["dob"],
                    glucose=p["glucose"],
                    haemoglobin=p["haemoglobin"],
                    cholesterol=p["cholesterol"]
                )
                db_p = models.Patient(
                    name=p["name"],
                    email=p["email"],
                    dob=datetime.strptime(p["dob"], "%Y-%m-%d").date(),
                    glucose=p["glucose"],
                    haemoglobin=p["haemoglobin"],
                    cholesterol=p["cholesterol"],
                    remarks=remarks
                )
                db.add(db_p)
            db.commit()
            print("Database seeding completed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
    yield

app = FastAPI(
    title="MIRA Health Prediction API",
    description="Medical Intelligence Robotic Automation Patient Vitals & Health Assessment API",
    version="1.0.0",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "MIRA Backend",
        "api_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY"))
    }

@app.post("/api/patients", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED, tags=["Patients"])
def create_patient_record(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    # Check if patient with this email already exists
    db_patient = crud.get_patient_by_email(db, email=patient.email)
    if db_patient:
        raise HTTPException(
            status_code=400,
            detail="A patient record with this email address already exists."
        )
    
    # Generate AI/ML Prediction remarks based on incoming vitals
    remarks = generate_patient_remarks(
        name=patient.name,
        dob=patient.dob.isoformat(),
        glucose=patient.glucose,
        haemoglobin=patient.haemoglobin,
        cholesterol=patient.cholesterol
    )
    
    return crud.create_patient(db=db, patient=patient, remarks=remarks)

@app.get("/api/patients", response_model=list[schemas.PatientResponse], tags=["Patients"])
def read_patient_records(search: str = None, db: Session = Depends(get_db)):
    return crud.get_patients(db=db, search=search)

@app.get("/api/patients/{patient_id}", response_model=schemas.PatientResponse, tags=["Patients"])
def read_single_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")
    return db_patient

@app.put("/api/patients/{patient_id}", response_model=schemas.PatientResponse, tags=["Patients"])
def update_patient_record(patient_id: int, patient_update: schemas.PatientUpdate, db: Session = Depends(get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")
    
    # If email is updated, make sure it is not taken by another patient
    if patient_update.email and patient_update.email != db_patient.email:
        existing_email_patient = crud.get_patient_by_email(db, email=patient_update.email)
        if existing_email_patient:
            raise HTTPException(
                status_code=400,
                detail="A patient record with this email address already exists."
            )
            
    # Determine if vitals or name/DOB have changed
    vitals_changed = (
        (patient_update.glucose is not None and patient_update.glucose != db_patient.glucose) or
        (patient_update.haemoglobin is not None and patient_update.haemoglobin != db_patient.haemoglobin) or
        (patient_update.cholesterol is not None and patient_update.cholesterol != db_patient.cholesterol) or
        (patient_update.dob is not None and patient_update.dob != db_patient.dob) or
        (patient_update.name is not None and patient_update.name != db_patient.name)
    )
    
    remarks = None
    if vitals_changed:
        # Recalculate remarks using updated or existing fields
        name = patient_update.name or db_patient.name
        dob = patient_update.dob or db_patient.dob
        glucose = patient_update.glucose if patient_update.glucose is not None else db_patient.glucose
        haemoglobin = patient_update.haemoglobin if patient_update.haemoglobin is not None else db_patient.haemoglobin
        cholesterol = patient_update.cholesterol if patient_update.cholesterol is not None else db_patient.cholesterol
        
        remarks = generate_patient_remarks(
            name=name,
            dob=dob.isoformat() if hasattr(dob, "isoformat") else str(dob),
            glucose=glucose,
            haemoglobin=haemoglobin,
            cholesterol=cholesterol
        )
        
    return crud.update_patient(db=db, db_patient=db_patient, patient_update=patient_update, remarks=remarks)

@app.delete("/api/patients/{patient_id}", tags=["Patients"])
def delete_patient_record(patient_id: int, db: Session = Depends(get_db)):
    db_patient = crud.get_patient(db, patient_id=patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")
    crud.delete_patient(db, db_patient=db_patient)
    return {"detail": "Patient record deleted successfully."}

# Mount static files & serve SPA frontend
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "MIRA Frontend assets are initializing. Please reload shortly."}

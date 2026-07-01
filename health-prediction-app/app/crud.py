from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models, schemas

def get_patient(db: Session, patient_id: int):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patient_by_email(db: Session, email: str):
    return db.query(models.Patient).filter(models.Patient.email == email).first()

def get_patients(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(models.Patient)
    if search:
        query = query.filter(
            or_(
                models.Patient.name.ilike(f"%{search}%"),
                models.Patient.email.ilike(f"%{search}%"),
                models.Patient.remarks.ilike(f"%{search}%")
            )
        )
    return query.order_by(models.Patient.created_at.desc()).offset(skip).limit(limit).all()

def create_patient(db: Session, patient: schemas.PatientCreate, remarks: str):
    db_patient = models.Patient(
        name=patient.name,
        email=patient.email,
        dob=patient.dob,
        glucose=patient.glucose,
        haemoglobin=patient.haemoglobin,
        cholesterol=patient.cholesterol,
        remarks=remarks
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def update_patient(db: Session, db_patient: models.Patient, patient_update: schemas.PatientUpdate, remarks: str = None):
    update_data = patient_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    
    if remarks is not None:
        db_patient.remarks = remarks
        
    db.commit()
    db.refresh(db_patient)
    return db_patient

def delete_patient(db: Session, db_patient: models.Patient):
    db.delete(db_patient)
    db.commit()
    return db_patient

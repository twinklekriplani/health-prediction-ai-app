from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["johndoe@example.com"])
    dob: date = Field(..., examples=["1990-05-15"])
    glucose: float = Field(..., gt=0, description="Glucose level in mg/dL", examples=[95.0])
    haemoglobin: float = Field(..., gt=0, description="Haemoglobin level in g/dL", examples=[14.5])
    cholesterol: float = Field(..., gt=0, description="Cholesterol level in mg/dL", examples=[180.0])

    @field_validator('dob')
    @classmethod
    def dob_must_not_be_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    dob: Optional[date] = None
    glucose: Optional[float] = Field(None, gt=0)
    haemoglobin: Optional[float] = Field(None, gt=0)
    cholesterol: Optional[float] = Field(None, gt=0)

    @field_validator('dob')
    @classmethod
    def dob_must_not_be_in_future(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

class PatientResponse(PatientBase):
    id: int
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }

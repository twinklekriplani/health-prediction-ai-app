# MIRA Backend Verification Script (ASCII-compatible)

import sys
import os

# Add current folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_checks():
    print("Testing backend modules import...")
    try:
        from app.database import engine, get_db, DB_PATH
        from app import models, schemas, crud
        from app.engine.predictor import generate_patient_remarks
        from app.main import app
        print("[PASS] All backend modules imported successfully.")
    except Exception as e:
        print(f"[FAIL] Module import failed: {e}")
        return False

    print("\nTesting database table initialization...")
    try:
        # Create database
        models.Base.metadata.create_all(bind=engine)
        print(f"[PASS] Database engine connected. SQLite DB located at: {DB_PATH}")
        if os.path.exists(DB_PATH):
            print(f"[PASS] Database file exists (Size: {os.path.getsize(DB_PATH)} bytes)")
        else:
            print("[FAIL] Database file not found!")
            return False
    except Exception as e:
        print(f"[FAIL] Database connection failed: {e}")
        return False

    print("\nTesting local predictive engine calculations...")
    try:
        # Test Case 1: Healthy Patient
        remarks_json_healthy = generate_patient_remarks(
            name="Alice Smith",
            dob="1995-04-10",
            glucose=85.0,
            haemoglobin=14.0,
            cholesterol=180.0
        )
        import json
        res_h = json.loads(remarks_json_healthy)
        assert res_h["risk_level"] == "Low", f"Expected Low Risk, got {res_h['risk_level']}"
        print("[PASS] Healthy test case passed (Risk: Low).")

        # Test Case 2: High Risk Patient (Diabetes & Cholesterol)
        remarks_json_diabetic = generate_patient_remarks(
            name="Bob Jones",
            dob="1970-08-22",
            glucose=140.0,
            haemoglobin=11.0,
            cholesterol=255.0
        )
        res_d = json.loads(remarks_json_diabetic)
        assert res_d["risk_level"] == "High", f"Expected High Risk, got {res_d['risk_level']}"
        print("[PASS] High Risk test case passed (Risk: High).")
        
    except Exception as e:
        print(f"[FAIL] Predictive engine validation failed: {e}")
        return False

    print("\n=======================================================")
    print("[PASS] ALL BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=======================================================")
    return True

if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)

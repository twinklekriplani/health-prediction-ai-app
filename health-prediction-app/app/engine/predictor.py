import json
import os
from typing import Dict, Any, Tuple
from app.engine.api_client import query_external_ai

def calculate_local_remarks(name: str, age_years: int, glucose: float, haemoglobin: float, cholesterol: float) -> str:
    """
    Evaluates patient parameters locally using a clinical decision matrix.
    Returns a JSON string containing structural findings, risk assessment, and recommendations.
    """
    conditions = []
    recommendations = []
    
    # 1. Evaluate Glucose (mg/dL)
    # Normal: 70-100, Impaired (Prediabetes): 100-125, Diabetic: >=126, Hypoglycemic: <70
    if glucose < 70:
        glucose_status = "Hypoglycemia (Low Blood Sugar)"
        conditions.append(glucose_status)
        recommendations.append("Consume 15-20 grams of fast-acting carbohydrates (e.g., fruit juice, honey) and retest in 15 minutes.")
        recommendations.append("Consult a doctor to evaluate potential causes of low blood sugar, such as medication dosage or prolonged fasting.")
        glucose_risk = "High"
    elif 70 <= glucose <= 100:
        glucose_status = "Normal Fasting Glucose"
        glucose_risk = "Low"
    elif 100 < glucose <= 125:
        glucose_status = "Impaired Fasting Glucose (Prediabetes)"
        conditions.append(glucose_status)
        recommendations.append("Reduce refined carbohydrate and sugar intake. Focus on whole grains, fiber, and lean proteins.")
        recommendations.append("Aim for at least 150 minutes of moderate-intensity physical activity per week.")
        glucose_risk = "Moderate"
    else:
        glucose_status = "Hyperglycemia (Possible Diabetes Range)"
        conditions.append(glucose_status)
        recommendations.append("Schedule a formal HbA1c test and consult a primary care physician or endocrinologist immediately.")
        recommendations.append("Limit high-glycemic foods, monitor daily glucose readings, and stay well hydrated.")
        glucose_risk = "High"

    # 2. Evaluate Haemoglobin (g/dL)
    # Normal: Male: 13.8-17.2, Female/General average: 12.0-17.5. Let's use 12.0-17.5 as standard reference.
    # Anemia: <12.0, Polycythemia: >17.5
    if haemoglobin < 12.0:
        haemo_status = "Anemia (Low Haemoglobin)"
        conditions.append(haemo_status)
        recommendations.append("Increase intake of iron-rich foods (red meat, poultry, beans, spinach) along with Vitamin C for better absorption.")
        recommendations.append("Check Ferritin and Vitamin B12 levels to identify the underlying type of anemia.")
        haemo_risk = "Moderate" if haemoglobin >= 10.0 else "High"
    elif 12.0 <= haemoglobin <= 17.5:
        haemo_status = "Normal Haemoglobin"
        haemo_risk = "Low"
    else:
        haemo_status = "Erythrocytosis (High Haemoglobin)"
        conditions.append(haemo_status)
        recommendations.append("Maintain optimal hydration. Dehydration is a common cause of elevated haemoglobin concentration.")
        recommendations.append("Discuss with a doctor to rule out secondary causes (e.g., sleep apnea, smoking, or bone marrow disorders).")
        haemo_risk = "Moderate"

    # 3. Evaluate Cholesterol (mg/dL)
    # Desirable: <200, Borderline High: 200-239, High: >=240
    if cholesterol < 200:
        chol_status = "Optimal Cholesterol"
        chol_risk = "Low"
    elif 200 <= cholesterol <= 239:
        chol_status = "Borderline High Cholesterol"
        conditions.append(chol_status)
        recommendations.append("Increase soluble fiber intake (oats, barley, legumes) and incorporate heart-healthy fats (olive oil, avocados).")
        recommendations.append("Limit saturated and trans fats found in processed meats, fried foods, and commercial baked goods.")
        chol_risk = "Moderate"
    else:
        chol_status = "Hypercholesterolemia (High Cholesterol)"
        conditions.append(chol_status)
        recommendations.append("Consult a physician to discuss a cardiovascular risk assessment and whether lipid-lowering therapy (e.g., statins) is advised.")
        recommendations.append("Incorporate daily aerobic exercise and consider a Mediterranean-style diet.")
        chol_risk = "High"

    # Determine overall risk level
    risk_mapping = {"Low": 1, "Moderate": 2, "High": 3}
    overall_score = max(risk_mapping[glucose_risk], risk_mapping[haemo_risk], risk_mapping[chol_risk])
    
    if overall_score == 1:
        overall_risk = "Low"
        summary = "All evaluated markers (Glucose, Haemoglobin, Cholesterol) fall within standard healthy reference ranges. Maintain your current active lifestyle and balanced diet."
        recommendations.append("Continue regular annual physical exams and routine screening blood tests.")
        recommendations.append("Maintain a balanced diet rich in vegetables, lean protein, and healthy fats.")
    elif overall_score == 2:
        overall_risk = "Moderate"
        summary = f"Borderline anomalies detected: {', '.join(conditions)}. Lifestyle modification is recommended to return these levels to the optimal reference range."
    else:
        overall_risk = "High"
        summary = f"Significant clinical variations identified: {', '.join(conditions)}. We strongly advise discussing these laboratory results with a qualified healthcare professional."

    # Build response structure
    result = {
        "engine": "Local Clinical Intelligence Matrix v1.2",
        "risk_level": overall_risk,
        "summary": summary,
        "conditions": conditions if conditions else ["No clinical abnormalities detected"],
        "recommendations": recommendations,
        "evaluations": {
            "glucose": {"value": glucose, "status": glucose_status, "risk": glucose_risk},
            "haemoglobin": {"value": haemoglobin, "status": haemo_status, "risk": haemo_risk},
            "cholesterol": {"value": cholesterol, "status": chol_status, "risk": chol_risk}
        }
    }
    return json.dumps(result)

def generate_patient_remarks(name: str, dob: str, glucose: float, haemoglobin: float, cholesterol: float) -> str:
    """
    Main prediction router. Tries to query external LLM API (if configured), 
    otherwise falls back to generating a structured report locally.
    """
    # Calculate age from DOB
    from datetime import datetime, date
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d").date() if isinstance(dob, str) else dob
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except Exception:
        age = 35  # default fallback age
        
    # Check if external AI is configured in environment
    api_key_configured = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if api_key_configured:
        # Try external AI
        ai_remarks = query_external_ai(name, age, glucose, haemoglobin, cholesterol)
        if ai_remarks:
            return ai_remarks
            
    # Fallback to local clinical matrix
    return calculate_local_remarks(name, age, glucose, haemoglobin, cholesterol)

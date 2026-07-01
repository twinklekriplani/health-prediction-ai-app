import os
import json
import httpx
from typing import Optional

def query_external_ai(name: str, age: int, glucose: float, haemoglobin: float, cholesterol: float) -> Optional[str]:
    """
    Queries Gemini or OpenAI using httpx to get an AI-generated clinical remark.
    Returns the JSON-formatted remarks string, or None if the request fails or key is missing.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    # Prompt instructing the AI to act as a health assistant and return a strict JSON format
    system_instruction = (
        "You are MIRA, an advanced Medical Intelligence Robotic Automation system.\n"
        "Your task is to analyze a patient's blood test results and generate a structured health assessment.\n"
        "You must respond ONLY with a raw JSON object matching the following structure. Do not wrap in markdown ```json blocks.\n"
        "{\n"
        '  "engine": "MIRA Cloud AI (Gemini/OpenAI)",\n'
        '  "risk_level": "Low" or "Moderate" or "High",\n'
        '  "summary": "A descriptive 2-3 sentence overview of the patient health status based on findings.",\n'
        '  "conditions": ["List of identified abnormalities or conditions"],\n'
        '  "recommendations": ["Actionable, personalized lifestyle, diet, and clinical next steps"],\n'
        '  "evaluations": {\n'
        '    "glucose": {"value": 0.0, "status": "Status name", "risk": "Low/Moderate/High"},\n'
        '    "haemoglobin": {"value": 0.0, "status": "Status name", "risk": "Low/Moderate/High"},\n'
        '    "cholesterol": {"value": 0.0, "status": "Status name", "risk": "Low/Moderate/High"}\n'
        '  }\n'
        "}\n\n"
        "Reference Ranges for analysis:\n"
        "- Glucose: Normal (70-100 mg/dL), Prediabetes (100-125 mg/dL), Diabetic (>=126 mg/dL), Low (<70 mg/dL).\n"
        "- Haemoglobin: Normal (12-17.5 g/dL), Anemic (<12 g/dL), Erythrocytosis (>17.5 g/dL).\n"
        "- Cholesterol: Optimal (<200 mg/dL), Borderline (200-239 mg/dL), High (>=240 mg/dL).\n"
    )
    
    user_prompt = (
        f"Patient Profile:\n"
        f"- Name: {name}\n"
        f"- Age: {age} years\n"
        f"- Fasting Glucose: {glucose} mg/dL\n"
        f"- Haemoglobin: {haemoglobin} g/dL\n"
        f"- Total Cholesterol: {cholesterol} mg/dL\n"
        f"Analyze these vitals and output the JSON response."
    )

    try:
        # Scenario 1: Gemini API
        if gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{
                    "parts": [{"text": f"{system_instruction}\n\n{user_prompt}"}]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            response = httpx.post(url, json=payload, timeout=12.0)
            if response.status_code == 200:
                data = response.json()
                text_content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Parse to validate it's correct JSON
                parsed_json = json.loads(text_content)
                parsed_json["engine"] = "MIRA Cloud AI (Gemini 2.5 Flash)"
                return json.dumps(parsed_json)

        # Scenario 2: OpenAI API
        elif openai_key:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            response = httpx.post(url, headers=headers, json=payload, timeout=12.0)
            if response.status_code == 200:
                data = response.json()
                text_content = data["choices"][0]["message"]["content"].strip()
                parsed_json = json.loads(text_content)
                parsed_json["engine"] = "MIRA Cloud AI (GPT-3.5)"
                return json.dumps(parsed_json)

    except Exception:
        # Ignore external errors and return None to fallback to local prediction engine
        pass
        
    return None

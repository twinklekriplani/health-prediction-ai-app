import uvicorn
import os

if __name__ == "__main__":
    print("==================================================================")
    print("  MIRA - Medical Intelligence Robotic Automation                  ")
    print("  Health Predictive Diagnostics Console                           ")
    print("==================================================================")
    print("  Starting development server...")
    print("  URL: http://127.0.0.1:8000")
    print("  Press Ctrl+C to terminate the process.")
    print("==================================================================")
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

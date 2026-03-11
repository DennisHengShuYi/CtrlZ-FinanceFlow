#!/usr/bin/env python3
"""Start the backend server and write output to a log file."""
import subprocess
import sys
import os

os.chdir("/Users/laiminhan/Desktop/VS/borneo/CtrlZ-The-ADCB/backend")
log_path = "/Users/laiminhan/Desktop/VS/borneo/CtrlZ-The-ADCB/backend/startup.log"

with open(log_path, "w") as f:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        stdout=f,
        stderr=subprocess.STDOUT,
    )
    print(f"Server PID: {proc.pid}")
    print(f"Log: {log_path}")

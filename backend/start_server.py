import subprocess
import sys
import os
from pathlib import Path

# Get script directory
base_dir = Path(__file__).parent.absolute()
os.chdir(base_dir)
log_path = base_dir / "startup.log"

print(f"Starting server in {base_dir}")
print(f"Logging to {log_path}")

with open(log_path, "w") as f:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        stdout=f,
        stderr=subprocess.STDOUT,
        env=os.environ.copy()
    )
    print(f"Backend Server PID: {proc.pid}")

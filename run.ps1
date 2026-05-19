# Musashi One GPT — Launch Script
# Usage:  .\run.ps1
# Opens:  http://localhost:8080/Musashi%20One%20GPT.html  (SPA frontend)
#         http://localhost:8501                            (RAG API, internal)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$env:PYTHONUTF8 = "1"

Write-Host ""
Write-Host "  Starting Musashi One GPT..." -ForegroundColor Cyan
Write-Host ""

# Start backend API server in a separate window
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-Command",
  "Write-Host '  API running on http://localhost:8501' -ForegroundColor Green; `$env:PYTHONUTF8=1; & '$root\.venv\Scripts\python.exe' -m uvicorn api:app --app-dir '$root\backend' --port 8501 --reload"
)

Start-Sleep -Seconds 1

Write-Host "  Frontend : http://localhost:8080/Musashi%20One%20GPT.html" -ForegroundColor Green
Write-Host "  API      : http://localhost:8501" -ForegroundColor Green
Write-Host ""
Write-Host "  Open the frontend URL in your browser." -ForegroundColor Yellow
Write-Host ""

& "$root\.venv\Scripts\python.exe" -m http.server 8080 --directory "$root\frontend"

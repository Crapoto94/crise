@echo off
setlocal

set "ROOT=%~dp0"

echo Demarrage du backend (port 4010)...
start "Backend - Photos Ivry" cmd /k "cd /d "%ROOT%backend" && npm run dev"

echo Demarrage du frontend (Vite)...
start "Frontend - Photos Ivry" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173

endlocal

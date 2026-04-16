@echo off
title Factory Manager Engine
pushd "%~dp0"
cls
echo ======================================================
echo   FACTORY MANAGER ENGINE - DATABASE SERVER (PB v0.35)
echo ======================================================
echo.
set APP_PORT=8090

echo [1/2] Poort %APP_PORT% vrijmaken...
taskkill /IM pocketbase.exe /F >nul 2>&1
timeout /t 1 /nobreak > nul

echo [2/2] Database opstarten op poort %APP_PORT%...
echo Dashboard: http://localhost:%APP_PORT%
echo.
pocketbase.exe serve --http="0.0.0.0:%APP_PORT%" --dir="./pb_data" --publicDir="./pb_public"

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo FOUT: De server kon niet starten. Controleer of pocketbase.exe aanwezig is.
    pause
)
popd

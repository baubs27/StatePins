@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-statepins.ps1" -Tunnel
exit /b %errorlevel%

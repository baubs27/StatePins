@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-statepins.ps1" -LiveApi
set EXITCODE=%errorlevel%
if not "%EXITCODE%"=="0" (
  echo.
  echo StateUp live API launcher stopped with error code %EXITCODE%.
  pause
)
exit /b %EXITCODE%

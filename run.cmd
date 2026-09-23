@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-statepins.ps1"
set EXITCODE=%errorlevel%
if not "%EXITCODE%"=="0" (
  echo.
  echo StateUp launcher stopped with error code %EXITCODE%.
  echo Leave this window open and send Codex the red error text above if it happens again.
  pause
)
exit /b %EXITCODE%

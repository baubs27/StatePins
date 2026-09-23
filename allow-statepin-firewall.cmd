@echo off
setlocal
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrator permission to allow StateUp local development ports...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Allowing StateUp local development ports through Windows Firewall...
netsh advfirewall firewall delete rule name="StateUp Expo Metro" >nul 2>&1
netsh advfirewall firewall delete rule name="StateUp API" >nul 2>&1
netsh advfirewall firewall add rule name="StateUp Expo Metro" dir=in action=allow protocol=TCP localport=8081-8099 profile=private,public
netsh advfirewall firewall add rule name="StateUp API" dir=in action=allow protocol=TCP localport=4000 profile=private,public
echo.
echo Done. Close and reopen run.cmd, then scan the new Expo QR code.
pause

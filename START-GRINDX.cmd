@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node scripts\serve.js --open
  goto end
)
set "GRINDX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%GRINDX_NODE%" (
  "%GRINDX_NODE%" scripts\serve.js --open
  goto end
)
echo Grind X needs Node.js 22 or newer. Install it from https://nodejs.org and reopen this launcher.
pause
:end
if errorlevel 1 pause
endlocal

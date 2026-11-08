@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Para usar el editor falta instalar Node.js ^(es gratis^).
  echo Descargalo en https://nodejs.org ^(version LTS^), instalalo y vuelve a abrir este archivo.
  pause
  exit /b 1
)
node scripts\admin.mjs
echo.
echo El editor se cerro. Puedes cerrar esta ventana.
pause

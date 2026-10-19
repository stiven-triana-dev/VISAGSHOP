@echo off
setlocal
cd /d "%~dp0"
title VisagShop Sprint 5 - Node.js + Express + EJS
echo.
echo ================================================
echo     VISAGSHOP  /  SPRINT 5  /  EXPRESS + EJS
echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Instala Node.js desde https://nodejs.org/
  pause
  exit /b 1
)
if not exist "package.json" (
  echo ERROR: No se encontro package.json.
  echo Extrae el ZIP completo, y ejecuta ESTE BAT en la carpeta que contiene package.json.
  pause
  exit /b 1
)
if not exist "node_modules\express\package.json" goto install
if not exist "node_modules\ejs\package.json" goto install
if not exist "node_modules\pg\package.json" goto install
goto run
:install
echo Instalando Express y EJS. Puede tardar unos minutos...
call npm install
if errorlevel 1 (
  echo ERROR: Comprueba tu conexion a Internet y vuelve a ejecutar.
  pause
  exit /b 1
)
:run
echo.
echo Abre http://localhost:3000 en tu navegador.
echo El panel admin requiere credenciales segun README.md.
echo.
call npm start
pause

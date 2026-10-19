@echo off
cd /d "%~dp0"
title VisagShop Sprint 4 - Administracion local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR_PANEL_ADMIN.ps1"
pause

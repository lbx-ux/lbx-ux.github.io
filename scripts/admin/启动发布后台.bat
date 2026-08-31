@echo off
chcp 65001 >nul
title lbx's Blog 发布后台
cd /d "%~dp0..\.."
echo 正在启动发布后台...
start "" http://127.0.0.1:8799
node scripts\admin\server.mjs
pause

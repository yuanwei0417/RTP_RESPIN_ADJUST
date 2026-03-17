@echo off
cd /d "%~dp0"
echo ========================================
echo   RTP Tool - 一鍵打包
echo ========================================
echo.

:: 檢查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js，請先安裝：https://nodejs.org/
    pause
    exit /b 1
)

:: 檢查 pkg
where pkg >nul 2>nul
if %errorlevel% neq 0 (
    echo [資訊] 正在安裝 pkg...
    npm install -g pkg
    if %errorlevel% neq 0 (
        echo [錯誤] pkg 安裝失敗
        pause
        exit /b 1
    )
)

:: 刪除舊的 exe
if exist rtp-tool.exe (
    echo [資訊] 刪除舊的 rtp-tool.exe...
    del /f rtp-tool.exe
)

:: 打包
echo [資訊] 開始打包...
pkg server.js --targets node18-win-x64 --output rtp-tool.exe --compress GZip
if %errorlevel% neq 0 (
    echo.
    echo [錯誤] 打包失敗
    pause
    exit /b 1
)

echo.
echo ========================================
echo   打包完成！
echo   輸出：rtp-tool.exe
for %%A in (rtp-tool.exe) do echo   大小：%%~zA bytes
echo ========================================
echo.
pause

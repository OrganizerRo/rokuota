@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Roku BrightScript Build and Validate
echo ============================================
echo.

where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npx not found. Install Node.js from https://nodejs.org
    exit /b 1
)

echo [1/3] Validating project structure...
if not exist "manifest" (
    echo ERROR: manifest not found. Run this from the project root.
    exit /b 1
)
if not exist "bsconfig.json" (
    echo ERROR: bsconfig.json not found.
    exit /b 1
)
if not exist "components" (
    echo ERROR: components directory not found.
    exit /b 1
)
if not exist "source\Main.brs" (
    echo ERROR: source\Main.brs not found.
    exit /b 1
)
echo    OK: Project structure valid.
echo.

echo [2/3] Running BrighterScript compiler (validation mode)...
echo.
npx brighterscript@latest --project bsconfig.json --create-package false
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo  BUILD FAILED - Fix errors above
    echo ============================================
    exit /b 1
)
echo.

echo [3/3] Building output package...
echo.
if not exist "out" mkdir out
npx brighterscript@latest --project bsconfig.json
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo  PACKAGE FAILED - Fix errors above
    echo ============================================
    exit /b 1
)

echo.
echo ============================================
echo  BUILD SUCCESSFUL
echo ============================================
if exist "out\rokuota.zip" (
    echo  Output: out\rokuota.zip
    for %%A in ("out\rokuota.zip") do echo  Size:   %%~zA bytes
)
echo.

endlocal

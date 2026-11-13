@echo off
setlocal

if "%~1"=="" (
    echo Usage: %~nx0 input-file [output-file]
    exit /b 2
)

if not exist "%~1" (
    echo Input file not found: "%~1"
    exit /b 2
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
    echo ffmpeg was not found on PATH.
    exit /b 2
)

set "INPUT=%~f1"
if "%~2"=="" (
    set "OUTPUT=%~dpn1_2pass.mp4"
) else (
    set "OUTPUT=%~2"
)
set "PASSLOG=%TEMP%\ffmpeg_2pass_%RANDOM%_%RANDOM%"

rem libx264 supports FFmpeg two-pass encoding; h264_mf does not.
ffmpeg -hwaccel d3d12va -i "%INPUT%" -map 0:v:0 -c:v libx264 -b:v 64k  -pass 1 -passlogfile "%PASSLOG%" -an -f null NUL
if errorlevel 1 goto :pass1_failed

ffmpeg -hwaccel d3d12va -i "%INPUT%" -map 0:v:0 -map 0:a:? -c:v libx264 -b:v 64k -pass 2 -passlogfile "%PASSLOG%" -ar 22050 -c:a libmp3lame -b:a 16k "%OUTPUT%"
if errorlevel 1 goto :pass2_failed

call :cleanup
echo Created "%OUTPUT%"
exit /b 0

:pass1_failed
set "RESULT=%ERRORLEVEL%"
call :cleanup
echo First-pass encoding failed.
exit /b %RESULT%

:pass2_failed
set "RESULT=%ERRORLEVEL%"
call :cleanup
echo Second-pass encoding failed.
exit /b %RESULT%

:cleanup
del /q "%PASSLOG%-0.log" "%PASSLOG%-0.log.mbtree" 2>nul
exit /b 0

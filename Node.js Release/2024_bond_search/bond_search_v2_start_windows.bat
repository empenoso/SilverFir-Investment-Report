@echo off
for /F "usebackq tokens=1,2 delims==" %%i in (`wmic os get LocalDateTime /VALUE 2^>NUL`) do if '.%%i.'=='.LocalDateTime.' set ldt=%%j
set ldt=%ldt:~0,4%-%ldt:~4,2%-%ldt:~6,2%_%ldt:~8,2%-%ldt:~10,2%
echo Wait
call node -v
call npm -v
echo Wait, under Windows %COMPUTERNAME% there is no process display
echo Check "log_%ldt%.txt" in "log" folder AFTER closing this window
echo Process started at %ldt%
pushd %~dp0
cmd /q /k node "%~dp0index.js" > "%~dp0log\log_%ldt%.txt"
exit
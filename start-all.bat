@echo off

echo Starting Frontend...
start cmd /k "cd /d C:\Users\Jaya Krishna\desktop\originbi-technical\frontend && npm run dev"

timeout /t 3

echo Starting Backend...
start cmd /k "cd /d C:\Users\Jaya Krishna\desktop\originbi-technical\backend && npm run dev"

timeout /t 3

echo Starting Student Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\desktop\originbi\originbi\backend\student-service && npm run start:dev"

timeout /t 3

echo Starting Auth Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\desktop\originbi\originbi\backend\auth-service && npm run start:dev"

echo All services started successfully!
pause
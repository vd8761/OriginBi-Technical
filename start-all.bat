@echo off

echo Starting Frontend...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi-Technical\frontend && npm run dev"

timeout /t 3

echo Starting Assessment Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi-Technical\backend\assessment-service && npm run dev"

timeout /t 3

echo Starting Backend...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi-Technical\backend && npm run dev"

timeout /t 3

echo Starting Student Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi\originbi\backend\student-service && npm run start:dev"

timeout /t 3

echo Starting Auth Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi\originbi\backend\auth-service && npm run start:dev"

timeout /t 3

echo Starting Admin Service...
start cmd /k "cd /d C:\Users\Jaya Krishna\Desktop\OriginBi\originbi\backend\admin-service && npm run start:dev"

echo All services started successfully!
pause
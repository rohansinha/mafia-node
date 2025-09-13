@echo off
echo Setting up Mafia Game Web App...
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo Or run: winget install OpenJS.NodeJS
    echo Then restart this script.
    pause
    exit /b 1
)

echo Node.js found!
node --version

echo.
echo Installing dependencies...
npm install

echo.
echo Setup complete!
echo.
echo To start the development server, run:
echo npm run dev
echo.
echo Then open http://localhost:3000 in your browser
echo.
pause
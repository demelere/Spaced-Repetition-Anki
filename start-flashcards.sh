#!/bin/bash

# Flash Card Generator Startup Script
# This script starts the server on port 34567 and opens Chrome

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the server is already running
if lsof -Pi :34567 -sTCP:LISTEN -t >/dev/null ; then
    echo "Server is already running on port 34567"
    # Just open Chrome to the app
    open http://localhost:34567
    exit 0
fi

# Start the server in the background
echo "Starting Flash Card Generator server on port 34567..."
PORT=34567 node server/server.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if the server started successfully
if ! lsof -Pi :34567 -sTCP:LISTEN -t >/dev/null ; then
    echo "Error: Failed to start server on port 34567"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "Server started successfully! Opening Chrome..."

# Open Chrome to the app
open http://localhost:34567

echo "Flash Card Generator is ready!"
echo "Server PID: $SERVER_PID"
echo "URL: http://localhost:34567"
echo ""
echo "To stop the server, run: kill $SERVER_PID" 
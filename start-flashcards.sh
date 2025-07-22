#!/bin/bash

# Flash Card Generator Startup Script for launchd
# This script starts the server in the foreground and opens Chrome

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NODE_PATH="/Users/stephenlin/.nvm/versions/node/v22.16.0/bin/node"
SERVER_PATH="$SCRIPT_DIR/server/server.js"
PORT=34567

# Start the server in the foreground (so launchd tracks it)
PORT=$PORT "$NODE_PATH" "$SERVER_PATH" &

SERVER_PID=$!
sleep 2

# Open Chrome to the app (only if not already open)
if ! pgrep -f "Google Chrome.*localhost:34567" > /dev/null; then
    open "http://localhost:34567"
fi

# Wait for the server process to exit (so launchd manages it)
wait $SERVER_PID
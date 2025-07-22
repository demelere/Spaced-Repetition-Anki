#!/bin/bash
PORT=34567
APP_URL="http://localhost:$PORT"
PLIST=~/Library/LaunchAgents/com.YOURNAME.flashcards.plist
SERVER_PID=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$SERVER_PID" ]; then
    STATUS_ICON="book.fill"
    STATUS_TEXT="Running"
    COLOR="green"
else
    STATUS_ICON="book.closed"
    STATUS_TEXT="Stopped"
    COLOR="red"
fi

CLIP_COUNT="0"
if [ -n "$SERVER_PID" ]; then
    CLIP_COUNT=$(curl -s http://localhost:$PORT/api/clipped-texts 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
fi

echo "| sfimage=$STATUS_ICON"
echo "---"
echo "Server: $STATUS_TEXT | color=$COLOR"
echo "Port: $PORT | color=gray"
echo "Clipped Texts: $CLIP_COUNT | color=blue"
echo "---"
if [ -n "$SERVER_PID" ]; then
    echo "Open App | href=$APP_URL refresh=true"
    echo "Stop Server | bash=/bin/bash param1=-c param2='launchctl unload -w $PLIST; sleep 0.5' terminal=false refresh=true"
else
    echo "Start Server | bash=/bin/bash param1=-c param2='launchctl load -w $PLIST; sleep 0.5' terminal=false refresh=true"
fi
echo "---"
echo "Send Test Clip | bash=/bin/bash param1=-c param2='curl -X POST http://localhost:$PORT/api/ingest -H \"Content-Type: application/json\" -d \"{\\\"text\\\":\\\"Test clip from SwiftBar\\\",\\\"source\\\":\\\"swiftbar-test\\\",\\\"title\\\":\\\"SwiftBar Test\\\"}\"' terminal=false refresh=true"
echo "---"
echo "Flashcard App v1.0"
echo "Port: $PORT"
echo "Auto-start: Enabled" 
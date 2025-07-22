# Flash Card Generator

A streamlined web application for creating high-quality spaced repetition flashcards using Claude 3.7, featuring Anki export and a mobile-responsive interface.

## Features

- Paste large documents (up to 15,000 words)
- Generates 3-20 cards based on text complexity and length
- Multiple card types, like core concepts, definitions, and conceptual mapping cards (relationships, hierarchies, analogies)
- Edit cards inline before saving if you want more control over the card content
- File overwriting on Chrome/Edge, and incremental naming on others
- Compatibility w/Anki import is the key, so TSV files are the source of truth.  Allows named TSV deck creation or loading existing TSV files and saving edits/additions to the same files

## Getting Started

### Prerequisites

- Chrome/Edge
- Claude API key from Anthropic
- Anki desktop application (to import the generated cards)

### Running Locally

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   
   **Option A: Using a .env file (recommended)**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your Claude API key
   # Get your API key from: https://console.anthropic.com/
   ```
   
   **Option B: Using environment variables**
   ```bash
   # Required for card generation
   export ANTHROPIC_API_KEY=your-claude-api-key-here
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000`

### Environment Variables

The application uses the following environment variables:

- `ANTHROPIC_API_KEY`: Required for Claude 3.7 API access
  - Can be set in a `.env` file or as an environment variable
  - If not set, users can still provide their API key through the web interface
- `PORT`: Optional server port (defaults to 3000)

**Note**: The application supports both server-side API key configuration (via `.env` file) and client-side API key management. Server-side configuration takes precedence if available.

## How to Use

### Creating a New Deck

1. Choose "Create New Named Deck"
2. Enter a descriptive name (creates `DeckName.tsv`)
3. Paste your study material (supports up to 15,000 words)
4. Highlight text sections and click "Create Cards"
5. Modify cards inline, change deck assignments as needed
6. Click "Save" to update your TSV file

### Loading Existing Decks

1. Choose "Load Existing TSV File"
2. Pick your existing TSV file from anywhere on your computer
3. Add new content and generate additional cards
4. Cards are saved back to the same file (or incremented version)

### Anki Import Instructions

1. Open Anki desktop application
2. Go to File → Import
3. Select your TSV file (e.g., `Biology.tsv`)
4. Configure import settings:
   - Basic (and reversed card)
   - Choose your target deck or create a new one
   - Tab
   - Yes (recommended for formatting)
5. Click Import to add the cards to your Anki collection

## Browser Compatibility
Chrome, Edge, and Opera support advanced features including true file overwriting, native file dialogs, and persistent file access across sessions. Firefox, Safari, and mobile browsers use compatibility mode with smart incremental naming (e.g., `Biology-2.tsv`, `Biology-3.tsv`) while maintaining full functionality and providing clear feedback about file handling behavior.

## Extension Integration

### Obsidian Web Clipper Integration
The app now supports receiving text from the Obsidian Web Clipper extension:

1. **Fork the Obsidian Web Clipper** and add a "Send to Flashcard App" action
2. **Configure the extension** to send text to `http://localhost:34567/api/ingest`
3. **Use the workflow**:
   - Highlight text on any webpage
   - Click the extension's "Send to Flashcard App" button
   - The text is sent to your local server
   - Open your flashcard app to see the pre-filled text ready for card generation

### Quick Start Script
Use the included startup script for easy access:

```bash
# Make the script executable (one-time setup)
chmod +x start-flashcards.sh

# Start the app on port 34567 and open Chrome
./start-flashcards.sh
```

### Manual Startup
```bash
# Start on custom port
PORT=34567 npm start

# Or use the npm script
npm run flashcards
```

The app runs on `http://localhost:34567` to avoid conflicts with other development servers.

## macOS Auto-Start & Menu Bar Integration (launchd + SwiftBar)

### Why this setup?
- **launchd** ensures the server is robustly managed, auto-starts at login, and restarts if it crashes.
- **SwiftBar** provides a live menu bar icon for status, quick actions, and one-click access.
- **Fractional sleep** after actions ensures the menu bar status is accurate without excessive polling.

### How it works
- A launchd plist manages the Node.js server as a persistent service.
- The SwiftBar plugin uses `launchctl` to start/stop the service and checks the port for status.
- The plugin uses `sfimage` for a clean, icon-only menu bar display.
- After starting/stopping, a short `sleep` ensures the status is up-to-date before SwiftBar refreshes.

### Example Files
- See `flashcards.swiftbar.example.sh` in the project root for a SwiftBar plugin template.
- See `com.YOURNAME.flashcards.example.plist` in the project root for a launchd plist template.

### Key Decisions Explained
- **launchd**: Handles process lifecycle, auto-restart, and login start.
- **PATH in plist**: Ensures Node.js (from NVM) is found by launchd.
- **Foreground server**: launchd tracks the process; no orphaned background jobs.
- **sfimage in SwiftBar**: Clean, icon-only status in the menu bar.
- **sleep after actions**: Ensures status is accurate before SwiftBar refreshes.
- **No excessive polling**: Keeps UI responsive and efficient.

---

## Next Steps

### Various fixes
* How to remember an exact relationship, an exact thing

Currently, the application focuses on basic knowledge and definition cards. To improve learning effectiveness and prevent cognitive plateaus, I plan to expand question types across Bloom's Taxonomy levels:
- Comprehension: "Explain why X works" or "Summarize the relationship between A and B"
- Application: "How would you use X in scenario Y?" or "What steps would you take to..."
- Analysis: "Compare and contrast X vs Y" or "What are the dependencies between..."
- Evaluation: "What are the trade-offs of approach X?" or "When would method A be better than B?"

To handle this cognitive complexity, I'm exploring specialized AI agents:
- Question Type Strategist: Determines optimal cognitive level distribution
- Domain Expert Agent: Understands subject-specific relationships
- Bloom's Taxonomy Specialist: Crafts questions targeting specific cognitive levels
- Learning Science Agent: Ensures appropriate difficulty progression

Implementation will likely use frameworks like KaibanJS or AgenticJS for agent orchestration.

- Individual Card Actions: Select specific cards to modify, expand, or change question types
- Radial or Pie menu for granular control over specific subsets of input text for even more targeted card generation or or generating additional cards that broaden or deepen understanding of the selected concepts
- Question Type Toggle: Convert existing cards between different cognitive levels

Tailored experiences for different learning modalities and information sources:
- Language Learning: Vocabulary acquisition, grammar patterns, cultural context

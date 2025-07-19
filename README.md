# Flash Card Generator

A streamlined web application for creating high-quality spaced repetition flashcards using Claude 3.7, featuring Anki export and a mobile-responsive interface.

## Features

### **Smart Card Generation**
- Paste large documents (up to 15,000 words) and get contextual analysis
- Adaptive Card Creation: Generates 3-20 cards based on text complexity and length
- Multiple Card Types: Core concepts, definitions, and conceptual mapping cards (relationships, hierarchies, analogies)
- Real-time Editing: Edit cards inline before saving - modify questions, answers, and deck assignments

### **File Management**
- Progressive Enhancement: True file overwriting on modern browsers (Chrome/Edge), smart incremental naming on others
- Named Deck Creation: Create custom-named TSV files with upfront file structure
- Existing File Loading: Load and continue working with existing TSV files
- Persistent Workflow: Save additions to the same file or create versioned copies

### **Export & Integration**
- TSV Format: Direct compatibility with Anki import
- Markdown Fallback: Alternative export format when needed
- Deck Organization: Automatic categorization with editable deck assignments

## Getting Started

### Prerequisites

- Modern web browser (Chrome/Edge recommended for advanced file features)
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

1. **Start the Application**: Choose "Create New Named Deck"
2. **Name Your Deck**: Enter a descriptive name (creates `DeckName.tsv`)
3. **Add Content**: Paste your study material (supports up to 15,000 words)
4. **Generate Cards**: Highlight text sections and click "Create Cards"
5. **Edit & Organize**: Modify cards inline, change deck assignments as needed
6. **Save**: Click "Save" to update your TSV file

### Loading Existing Decks

1. **Load Deck**: Choose "Load Existing TSV File"
2. **Select File**: Pick your existing TSV file from anywhere on your computer
3. **Continue Working**: Add new content and generate additional cards
4. **Save Updates**: Cards are saved back to the same file (or incremented version)

### Anki Import Instructions

1. Open Anki desktop application
2. Go to File → Import
3. Select your TSV file (e.g., `Biology.tsv`)
4. Configure import settings:
   - **Type**: Basic (and reversed card)
   - **Deck**: Choose your target deck or create a new one
   - **Fields separated by**: Tab
   - **Allow HTML in fields**: Yes (recommended for formatting)
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

## Next Steps

### Various fixes
* How to remember an exact relationship, an exact thing
* 

### **Enhanced Question Types**
Currently, the application focuses on basic knowledge and definition cards. To improve learning effectiveness and prevent cognitive plateaus, we plan to expand question types across Bloom's Taxonomy levels:

- Comprehension: "Explain why X works" or "Summarize the relationship between A and B"
- Application: "How would you use X in scenario Y?" or "What steps would you take to..."
- Analysis: "Compare and contrast X vs Y" or "What are the dependencies between..."
- Evaluation: "What are the trade-offs of approach X?" or "When would method A be better than B?"

### **Agent-Based Architecture**
To handle this cognitive complexity, we're exploring specialized AI agents:
- Question Type Strategist: Determines optimal cognitive level distribution
- Domain Expert Agent: Understands subject-specific relationships
- Bloom's Taxonomy Specialist: Crafts questions targeting specific cognitive levels
- Learning Science Agent: Ensures appropriate difficulty progression

Implementation will likely use frameworks like KaibanJS or AgenticJS for agent orchestration.

### **Advanced Card Management UI**
Enhanced interface features for granular control:
- Individual Card Actions: Select specific cards to modify, expand, or change question types
- Subset Text Processing: Highlight portions of input text for targeted card generation
- Context Expansion: Generate additional cards that broaden or deepen understanding of selected concepts
- Question Type Toggle: Convert existing cards between different cognitive levels
- Batch Operations: Apply changes to multiple cards simultaneously

### **Learning Analytics**
- Performance Tracking: Monitor which question types are most effective
- Adaptive Difficulty: Adjust question complexity based on user mastery
- Spaced Repetition Optimization: Intelligent scheduling recommendations

### **Specialized Use Cases & Workflows**
Tailored experiences for different learning modalities and information sources:
- Language Learning: Vocabulary acquisition, grammar patterns, cultural context

## Design Principles

This application follows established principles for effective spaced repetition learning:

- **Atomicity**: Each card tests one specific concept
- **Clarity**: Cards use precise language focused on understanding
- **Connections**: Building relationships between concepts
- **Progressive Complexity**: Supporting advancement through cognitive levels

The UI design prioritizes:

- **Simplicity**: Focus on core functionality without overwhelming options
- **Mobile-Responsive**: Seamless experience across all devices
- **Space Efficiency**: Compact card design maximizing screen real estate
- **Intuitive Interactions**: Minimal learning curve for new users

## License

MIT
# Flash Card Generator

A streamlined web application for creating high-quality spaced repetition flashcards using Claude 3.7, featuring Anki export and a mobile-responsive interface.

## Features

- **Spaced Repetition Cards**
  - Paste text and highlight sections to create flashcards
  - Uses Claude 3.7 to generate effective cards following best practices
  - Cards are automatically categorized into appropriate Mochi decks
  - Edit cards inline before exporting

- **Anki Integration**
  - Export cards in TSV format for easy Anki import
  - Accumulate cards across multiple sessions in a single file
  - Choose from predefined deck categories or create custom ones
  - Fallback to markdown export if needed

- **Modern User Interface**
  - Clean, intuitive design with dropdown menu
  - Mobile-responsive layout
  - Real-time notification system
  - Confirmation modals for destructive actions
  - Resizable split panels for comfortable editing
  - Compact card design for efficient space utilization

## Getting Started

### Prerequisites

- Modern web browser
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

### API Key Configuration

The application supports two ways to configure your Claude API key:

1. **Server-side (Recommended for production)**
   - Set `ANTHROPIC_API_KEY` in your `.env` file
   - The API key is stored securely on the server
   - Users don't need to enter their own API key
   - Better for shared deployments or production environments

2. **Client-side (Default behavior)**
   - Users enter their API key through the web interface
   - API key is stored in browser localStorage
   - More flexible for individual users
   - Works when server-side key is not configured

The application automatically detects which method is available and adjusts the user interface accordingly.

## How to Use

### Creating Flashcards

1. Paste text into the input area
2. Highlight a section of text
3. Click "Create Cards"
4. Review and edit the generated cards
5. Optionally change the deck for any card by clicking the deck label
6. Use the dropdown menu to export to Anki (TSV format) or as markdown
7. Import the downloaded TSV file into Anki using File → Import

### Anki Import Instructions

1. Open Anki desktop application
2. Go to File → Import
3. Select the downloaded TSV file (e.g., `anki-cards-2024-01-15.txt`)
4. Configure import settings:
   - **Type**: Basic (and reversed card)
   - **Deck**: Choose your target deck or create a new one
   - **Fields separated by**: Tab
   - **Allow HTML in fields**: Yes (recommended for formatting)
5. Click Import to add the cards to your Anki collection

The TSV format includes three columns: Front, Back, and Deck. Each card's deck assignment will be preserved during import.

## Design Principles

This application follows established principles for effective spaced repetition learning:

- **Atomicity**: Each card tests one specific concept
- **Clarity**: Cards use precise language focused on understanding
- **Connections**: Building relationships between concepts
- **Deep Understanding**: Emphasizing "why" and "how" questions

The UI design prioritizes:

- Simplicity and focus on the core functionality
- Mobile-responsive layout that works on any device
- Space efficiency with compact card design
- Intuitive interactions with minimal learning curve

## License

MIT
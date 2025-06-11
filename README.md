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
3. Set your API key as environment variable:
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
- `PORT`: Optional server port (defaults to 3000)

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
# Flash Card Generator

A streamlined web application for creating high-quality spaced repetition flashcards using Claude 3.7, featuring direct Mochi integration and a mobile-responsive interface.

## Features

- **Spaced Repetition Cards**
  - Paste text and highlight sections to create flashcards
  - Uses Claude 3.7 to generate effective cards following best practices
  - Cards are automatically categorized into appropriate Mochi decks
  - Edit cards inline before exporting

- **Mochi Integration**
  - Dynamic deck fetching from your Mochi account
  - Direct upload to Mochi without file handling
  - Fallback to markdown export if API is unavailable
  - Properly handles deck organization (excludes trashed/archived)

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
- (Optional) Mochi API key for direct integration

### Running Locally

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your API keys as environment variables:
   ```bash
   # Required for card generation
   export ANTHROPIC_API_KEY=your-claude-api-key-here
   
   # Optional for direct Mochi integration
   export MOCHI_API_KEY=your-mochi-api-key-here
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000`

### Environment Variables

The application uses the following environment variables:

- `ANTHROPIC_API_KEY`: Required for Claude 3.7 API access
- `MOCHI_API_KEY`: Optional for Mochi integration (direct deck fetching and upload)
- `PORT`: Optional server port (defaults to 3000)

## How to Use

### Creating Flashcards

1. Paste text into the input area
2. Highlight a section of text
3. Click "Create Cards"
4. Review and edit the generated cards
5. Optionally change the deck for any card by clicking the deck label
6. Use the dropdown menu to export to Mochi or as markdown

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
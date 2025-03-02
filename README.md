# SpacedRep Card Creator

A web application for creating high-quality spaced repetition flashcards from highlighted text using Claude 3.7.

## Features

- Paste text and highlight sections to create flashcards
- Uses Claude 3.7 to generate effective flashcards following best practices
- Categorizes cards into appropriate decks automatically
- Edit cards before exporting
- Export cards in Mochi-compatible format

## Getting Started

### Prerequisites

- Modern web browser
- Claude API key (for production use)

### Running Locally

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your Claude API key as an environment variable
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000`

### Setting Up Claude API

The application uses environment variables for API keys:

1. Get a Claude API key from [Anthropic](https://www.anthropic.com/)
2. Set the environment variable `CLAUDE_API_KEY` with your API key:
   ```bash
   # On Mac/Linux
   export CLAUDE_API_KEY=your-api-key-here
   
   # On Windows
   set CLAUDE_API_KEY=your-api-key-here
   ```
3. Start the server with the environment variable set

## How to Use

1. Paste text into the input area
2. Highlight a section of text
3. Click "Generate Cards from Selection"
4. Review and edit the generated cards
5. Continue highlighting and generating more cards
6. Export to Mochi when finished

## Deployment Options

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the `CLAUDE_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy

### Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add the `CLAUDE_API_KEY` as an environment variable in the Netlify dashboard
4. Deploy

### Heroku

1. Create a new Heroku app
2. Push your code to Heroku
3. Set the Config Var `CLAUDE_API_KEY` in the Heroku dashboard
4. Deploy

## Exporting to Mochi

The application exports cards in Mochi's JSON format. To import:

1. Generate the export file using the "Export to Mochi" button
2. In Mochi, use the import function to load your cards

## Design Principles

This application follows spaced repetition principles from Michael Nielsen and Andy Matuschak, focusing on:

- Atomicity: Each card tests one specific concept
- Clarity: Cards use precise language and focus on understanding
- Connections: Building relationships between concepts
- Deep understanding: Emphasizing "why" and "how" questions

## Future Enhancements

- PDF and EPUB text extraction
- More export formats (Anki, etc.)
- Custom card templates
- Image support
- Review scheduling

## License

MIT
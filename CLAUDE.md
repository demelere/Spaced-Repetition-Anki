# SpacedRep Card Creator - Project Documentation

## Project Overview

SpacedRep Card Creator is a web application that helps users create high-quality spaced repetition flashcards from text content. The application allows users to paste text, highlight sections of interest, and generate flashcards using Claude 3.7 to identify key concepts and create effective question-answer pairs.

### Core Purpose

The goal is to make it easy to create effective spaced repetition cards that follow best practices established by researchers like Michael Nielsen and Andy Matuschak. The application focuses on generating cards that build conceptual understanding rather than rote memorization.

## Technical Architecture

### Frontend
- Pure HTML/CSS/JavaScript implementation
- Text input area with highlighting capabilities
- Card preview and editing interface
- Export functionality for Mochi app format

### Backend
- Node.js Express server
- Claude 3.7 API integration for card generation
- Environment variable-based API key management

## Key Functionality

1. **Text Input & Selection**: 
   - Users paste text and highlight sections they want to convert to flashcards
   - Text is properly sanitized and displayed with preserved formatting

2. **Card Generation**:
   - Highlighted text is sent to Claude 3.7 via the server
   - Claude generates 1-5 cards based on content complexity
   - Cards follow best practices for spaced repetition learning
   - Claude suggests appropriate deck categorization

3. **Card Format**:
   - Each card has:
     - Front (question/prompt)
     - Back (answer/explanation)
     - Deck category from predefined options

4. **Deck Categorization**:
   - CS/Hardware
   - Math/Physics
   - AI/Alignment
   - History/Military/Current
   - Quotes/Random
   - Bio
   - Econ/Finance

5. **Export**:
   - Cards can be exported in Mochi-compatible JSON format
   - Each deck has a specific ID for proper categorization in Mochi

## Implementation Details

### API Communication

- Claude API is accessed through server-side endpoint
- API calls request JSON-formatted response
- Format examples are provided in the system prompt
- JSON responses are parsed and validated

### Card Parsing Logic

- Response is expected in JSON format
- Multiple fallback parsing methods if needed
- Graceful error handling with user feedback

### UI Interaction

- Text highlight triggers card generation
- Generated cards can be edited, deleted or recategorized
- Sanitization prevents HTML injection
- Cards are stored in application state

## Environment Setup

- Run with `npm start`
- Requires Claude API key in environment variable `CLAUDE_API_KEY`
- Server runs on port 3000 by default

## Future Enhancements

- PDF and EPUB text extraction
- Integration with additional spaced repetition systems
- Custom card templates
- Improved collaboration features
- Card organization and tagging

## Common Commands

```bash
# Start the server
npm start

# Run in development mode with auto-restart
npm run dev
```

## Notes on Development

- The most critical aspect is generating high-quality cards that follow effective learning principles
- Card quality depends heavily on Claude's understanding of the text and spaced repetition principles
- The JSON format for Claude's response is critical for reliable parsing
- Security considerations are important for user-generated content

## Project History

This project was built to help create high-quality flashcards following the principles of effective learning as outlined by researchers in the field of spaced repetition. The goal is to make it easier to create cards that build conceptual understanding rather than mere memorization.
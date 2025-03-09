# Mochi Card Generator - Project Documentation

## Project Overview

Mochi Card Generator is a web application that helps users create high-quality spaced repetition flashcards and interview questions from text content. The application allows users to paste text, highlight sections of interest, and use Claude 3.7 to generate effective content for learning and interviewing.

### Core Purpose

The goal is to streamline the creation of effective spaced repetition cards that follow best practices established by researchers like Michael Nielsen and Andy Matuschak. The application focuses on generating cards that build conceptual understanding rather than rote memorization, while also offering functionality to create interview questions for podcast preparation.

## Technical Architecture

### Frontend
- Pure HTML/CSS/JavaScript implementation
- Text input area with highlighting capabilities
- Card and question preview with inline editing
- Modern UI with modals and notifications
- Direct Mochi integration for seamless workflow

### Backend
- Node.js Express server
- Claude 3.7 API integration
- Mochi API integration for deck management and direct upload
- Environment variable-based API key management

## Key Functionality

1. **Text Input & Selection**: 
   - Users paste text and highlight sections they want to convert to flashcards or questions
   - Text is properly sanitized and displayed with preserved formatting
   - Resizable interface with split-panel design

2. **Card Generation**:
   - Highlighted text is sent to Claude 3.7 via the server
   - Claude generates 1-5 cards based on content complexity
   - Cards follow best practices for spaced repetition learning
   - Appropriate deck categorization based on Mochi decks

3. **Question Generation**:
   - Highlighted text is analyzed to create podcast interview questions
   - Questions focus on thought-provoking, open-ended inquiries
   - Topic tags are automatically generated for organization
   - Questions can be exported as markdown

4. **Mochi Integration**:
   - Dynamic fetching of deck list from user's Mochi account
   - Direct upload to Mochi without file handling
   - Proper filtering for active decks (excludes trashed/archived)
   - Fallback to file export if API integration is unavailable

5. **User Experience**:
   - Modern notification system instead of alerts
   - Confirmation modals for destructive actions
   - Tabbed interface for cards and questions
   - Inline editing of all generated content

## Implementation Details

### API Communication

- Claude API for intelligent content generation
- Mochi API for deck management and card uploads
- Structured JSON formats for reliable data exchange
- Proper error handling with graceful fallbacks

### Data Management

- Clean state management for cards and questions
- Deck synchronization with Mochi
- Data sanitization to prevent security issues
- Proper escaping and formatting for exports

### UI Interaction

- Text highlighting triggers generation
- Real-time inline editing of cards and questions
- Responsive design with resizable panels
- Modal-based interfaces for critical actions

## Environment Setup

- Run with `npm start`
- Requires Claude API key in environment variable `ANTHROPIC_API_KEY`
- Optional Mochi API key in environment variable `MOCHI_API_KEY`
- Server runs on port 3000 by default

## Common Commands

```bash
# Start the server
npm start

# Run in development mode with auto-restart
npm run dev
```

## Notes on Development

- Card quality depends heavily on Claude's understanding of the text and spaced repetition principles
- Mochi API integration requires proper authentication and error handling
- The application should gracefully degrade when APIs are unavailable
- Modern UI patterns enhance usability without compromising performance

## Future Enhancements

- PDF and EPUB text extraction
- Integration with additional spaced repetition systems
- Improved authentication flow for Mochi
- Offline functionality with local storage
- Customizable card templates
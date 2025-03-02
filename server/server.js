// Simple server for handling API requests with environment variables
// Load .env file if present
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not installed, using process.env directly');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src')));

// API endpoint for Claude
app.post('/api/generate-cards', async (req, res) => {
  try {
    const { text, defaultDeck } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Get API key from environment
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Claude system prompt
    const systemPrompt = `You are an expert in creating high-quality spaced repetition flashcards. 
    Your task is to generate effective flashcards from the provided text excerpt.
    
    Guidelines for creating excellent flashcards:
    1. Focus on core concepts and relationships rather than trivia or isolated facts
    2. Break complex ideas into smaller, atomic concepts
    3. Ensure each card tests one specific idea (atomic)
    4. Use precise, clear language
    5. Front of card should ask a specific question that prompts recall
    6. Back of card should provide a concise, complete answer
    7. Avoid creating cards that can be answered through pattern matching or recognition
    8. Create cards that build conceptual understanding and connections
    9. Focus on "why" and "how" questions that develop deeper understanding
    10. Promote connections between concepts across domains when relevant
    
    You will also analyze the content and suggest an appropriate deck category from these options:
    - CS/Hardware
    - Math/Physics
    - AI/Alignment
    - History/Military/Current
    - Quotes/Random
    - Bio
    - Econ/Finance
    
    IMPORTANT - You must output your response as a valid JSON array of card objects. Each card object must have the following structure:
    
    {
      "front": "The question or prompt text goes here",
      "back": "The answer or explanation text goes here",
      "deck": "One of the deck categories listed above"
    }
    
    Example of expected JSON format:
    
    [
      {
        "front": "What is the primary function of X?",
        "back": "X primarily functions to do Y by using mechanism Z.",
        "deck": "CS/Hardware"
      },
      {
        "front": "Why is concept A important in the context of B?",
        "back": "Concept A is crucial because it enables process C and prevents problem D.",
        "deck": "Math/Physics"
      }
    ]
    
    Generate between 1-5 cards depending on the complexity and amount of content in the text.
    Your response must be ONLY valid JSON - no introduction, no explanation, no markdown formatting.`;
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219', // Updated to the latest model
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please create spaced repetition flashcards from the following text excerpt.
            Use the guidelines from the system prompt.
            Default deck category (if content doesn't clearly match another category): ${defaultDeck}
            
            Remember to return ONLY a valid JSON array of flashcard objects matching the required format.
            
            Text excerpt:
            ${text}`
          }
        ],
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API Error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const claudeResponse = await response.json();
    
    // Log the response for debugging
    console.log('Claude API response structure:', Object.keys(claudeResponse));
    if (claudeResponse.content) {
      console.log('Content types:', claudeResponse.content.map(item => item.type).join(', '));
    }
    
    // Send the raw response back to client
    // Client-side parsing will handle the rest
    res.json(claudeResponse);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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

// Log available environment variables for debugging (without exposing values)
console.log('Environment variables available:', Object.keys(process.env).filter(key => 
  key.includes('API_KEY') || key.includes('TOKEN')
).map(key => `${key}: ${key.includes('KEY') ? '****' : 'configured'}`));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src')));

// Add middleware to expose environment variables to client
// Only expose MOCHI_API_KEY but NOT the actual key value
app.use((req, res, next) => {
  res.locals.envVars = {
    hasMochiApiKey: !!process.env.MOCHI_API_KEY
  };
  next();
});

// API endpoint for Claude to generate cards
app.post('/api/generate-cards', async (req, res) => {
  try {
    const { text, defaultDeck, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use user-provided API key if available, otherwise fall back to environment variable
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured. Please provide a Claude API key.' });
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
    
    You will also analyze the content and suggest an appropriate deck category.
    The specific deck options will be dynamically determined and provided in the user message.
    
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
            
            Available deck categories: ${req.body.deckOptions || Object.keys(req.body.deckMap || {}).join(', ') || defaultDeck}
            Default deck category: ${defaultDeck}
            
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

// API endpoint for generating interview questions
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { text, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use user-provided API key if available, otherwise fall back to environment variable
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured. Please provide a Claude API key.' });
    }
    
    // Claude system prompt for generating podcast interview questions
    const systemPrompt = `You are an expert research assistant for the host of a podcast, helping prepare insightful interview questions based on text excerpts.

    Guidelines for creating excellent interview questions:
    1. Focus on thought-provoking, open-ended questions that can't be answered with a simple yes/no
    2. Address key concepts, relationships, and implications from the text
    3. Create questions that explore the "why" and "how" behind ideas, not just "what"
    4. Identify potential disagreements or controversial aspects that would make for interesting discussion
    5. Formulate questions that connect ideas from the text to broader contexts or implications
    6. Ensure questions are specific enough to be meaningful but open enough to allow for expansive answers
    7. Prioritize questions that will help the audience understand complex or novel ideas
    8. Make sure questions are clear, concise, and directly usable without additional context
    
    IMPORTANT - You must output your response as a valid JSON array of question objects. Each question object must have the following structure:
    
    {
      "question": "The complete interview question goes here. Make it standalone without requiring additional context.",
      "topic": "A short topic label (1-3 words) to categorize this question"
    }
    
    Example of expected JSON format:
    
    [
      {
        "question": "You've written that quantum computing represents a fundamental shift in information processing. Can you explain why traditional computing approaches might be insufficient for the problems quantum computing aims to solve?",
        "topic": "Quantum Computing"
      },
      {
        "question": "In your analysis of large language models, you suggest there's a tension between capabilities and alignment. How do you think this tension might be resolved as models continue to advance?",
        "topic": "AI Safety"
      }
    ]
    
    Generate between 3-8 questions depending on the complexity and amount of content in the text.
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
        model: 'claude-3-7-sonnet-20250219',
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please create podcast interview questions based on the following text excerpt.
            Use the guidelines from the system prompt.
            
            Remember to return ONLY a valid JSON array of question objects matching the required format.
            
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
    
    // Send the raw response back to client
    res.json(claudeResponse);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint removed

// API endpoint to fetch decks from Mochi
app.get('/api/mochi-decks', async (req, res) => {
  try {
    // Get Mochi API key from query parameter or environment
    const mochiApiKey = req.query.userMochiKey || process.env.MOCHI_API_KEY;
    if (!mochiApiKey) {
      return res.status(500).json({ 
        error: 'Mochi API key not configured',
        fallbackDecks: { "General": "general" }
      });
    }
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
    const base64ApiKey = Buffer.from(`${mochiApiKey}:`).toString('base64');
    const authToken = `Basic ${base64ApiKey}`;
    
    // Fetch decks from Mochi API
    const response = await fetch('https://app.mochi.cards/api/decks/', {
      method: 'GET',
      headers: {
        'Authorization': authToken
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mochi API Error: ${errorText}`);
    }
    
    const decksData = await response.json();
    
    // Transform data for client use
    const formattedDecks = {};
    
    // Filter out trashed and archived decks
    const activeDeckCount = decksData.docs.length;
    let activeDecksCount = 0;
    
    decksData.docs.forEach(deck => {
      // Skip decks that are in trash or archived
      if (deck['trashed?'] || deck['archived?']) {
        return; // Skip this deck
      }
      
      // Only include active decks
      activeDecksCount++;
      
      // Remove [[ ]] if present in the ID
      const cleanId = deck.id.replace(/\[\[|\]\]/g, '');
      formattedDecks[deck.name] = cleanId;
    });
    
    console.log(`Loaded ${activeDecksCount} active decks out of ${activeDeckCount} total decks from Mochi API`);
    
    res.json({
      success: true,
      decks: formattedDecks,
      deckCount: activeDecksCount
    });
    
  } catch (error) {
    console.error('Error fetching Mochi decks:', error);
    res.status(500).json({ 
      error: error.message,
      fallbackDecks: {
        "General": "general"
      }
    });
  }
});

// API endpoint to check environment status
app.get('/api/env-status', (req, res) => {
  res.json({
    hasMochiApiKey: !!process.env.MOCHI_API_KEY
  });
});

// API endpoint for direct Mochi integration
app.post('/api/upload-to-mochi', async (req, res) => {
  try {
    const { cards, userMochiKey } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    
    // Get Mochi API key from request or environment
    const mochiApiKey = userMochiKey || process.env.MOCHI_API_KEY;
    if (!mochiApiKey) {
      return res.status(500).json({ error: 'Mochi API key not configured' });
    }
    
    console.log('Starting Mochi API upload');
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
    // Format: "Basic " + base64(apiKey + ":")
    const base64ApiKey = Buffer.from(`${mochiApiKey}:`).toString('base64');
    const authToken = `Basic ${base64ApiKey}`;
    
    // Upload each card to Mochi
    const results = [];
    
    for (const card of cards) {
      try {
        console.log('Uploading card to Mochi:', JSON.stringify({
          'content': card.content.substring(0, 20) + '...',
          'deck-id': card['deck-id']
        }));
        
        // Use HTTP Basic Auth header format
        const response = await fetch('https://app.mochi.cards/api/cards/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
          },
          body: JSON.stringify({
            'content': card.content,
            'deck-id': card['deck-id']
          })
        });
        
        const responseText = await response.text();
        console.log('Mochi API response:', response.status, responseText.substring(0, 100));
        
        if (response.ok) {
          let responseData;
          try {
            responseData = JSON.parse(responseText);
            results.push({ success: true, id: responseData.id });
          } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            results.push({ success: true, response: responseText });
          }
        } else {
          results.push({ success: false, error: responseText, status: response.status });
        }
      } catch (cardError) {
        console.error('Error uploading to Mochi:', cardError);
        results.push({ success: false, error: cardError.message });
      }
    }
    
    res.json({
      success: true,
      results: results,
      totalSuccess: results.filter(r => r.success).length,
      totalCards: cards.length
    });
    
  } catch (error) {
    console.error('Server error during Mochi upload:', error);
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
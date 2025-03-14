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

// Helper function to truncate text to a reasonable size to reduce payload
function truncateText(text, maxLength = 8000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
}


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://spaced-rep.vercel.app',
    'https://spaced-rep-ten.vercel.app',
    'https://pod-prep.com',
    new RegExp(/https:\/\/spaced-.*\.vercel\.app/)
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
// API endpoint for initial text analysis
app.post('/api/analyze-text', async (req, res) => {
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
    
    // Truncate text if extremely long
    const truncatedText = truncateText(text, 10000);
    
    // Create the request payload
    const analyzePayload = {
      model: 'claude-3-7-sonnet-20250219',
      system: 'You analyze text to extract key contextual information. Create a concise 1-2 paragraph summary that includes: the author/source if identifiable, the main thesis or argument, key points, and relevant background. This summary will serve as context for future interactions with sections of this text.',
      messages: [
        {
          role: 'user',
          content: `Please analyze this text and provide a concise contextual summary (1-2 paragraphs maximum):

${truncatedText}`
        }
      ],
      max_tokens: 1000
    };
    
    // Print the EXACT string that Anthropic will see
    console.log('\n===== EXACT ANTHROPIC ANALYSIS PROMPT =====');
    console.log('SYSTEM PROMPT:', analyzePayload.system);
    console.log('\nUSER PROMPT:', analyzePayload.messages[0].content);
    console.log('============================================\n');
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(analyzePayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API Error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const claudeResponse = await response.json();
    res.json(claudeResponse);
    
  } catch (error) {
    console.error('Server error during text analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-cards', async (req, res) => {
  try {
    const { text, textContext, deckOptions, userApiKey } = req.body;
    
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
    Your task is to generate effective flashcards from the highlighted text excerpt, with the full text provided for context.
    
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
    11. Whenever you're describing the author's viewpoint or prediction (and not just raw facts), feel free to cite them (or the resource itself) in the question 
    
    You will also analyze the content and suggest an appropriate deck category.
    The specific deck options will be dynamically determined and provided in the user message.
    
    CRITICAL: You MUST ALWAYS output your response as a valid JSON array of card objects. NEVER provide any prose, explanation or markdown formatting.
    
    Each card object must have the following structure:
    
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
    
    Generate between 1-5 cards depending on the complexity and amount of content in the highlighted text.
    Your response MUST BE ONLY valid JSON - no introduction, no explanation, no markdown formatting.`;
    
    // Create the request payload
    const cardsPayload = {
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please create spaced repetition flashcards from the SELECTED TEXT below.
Use the guidelines from the system prompt.

Available deck categories: ${deckOptions || Object.keys(req.body.deckMap || {}).join(', ') || "General"}

Remember to return ONLY a valid JSON array of flashcard objects matching the required format.

PRIMARY FOCUS - Selected Text (create cards from this):
${truncateText(text)}

${textContext ? `OPTIONAL BACKGROUND - Document Context (use only if helpful for understanding the selected text):
${textContext}` : ''}`
        }
      ],
      max_tokens: 4000
    };
    
    // Print the EXACT string that Anthropic will see
    console.log('\n===== EXACT ANTHROPIC PROMPT =====');
    console.log('SYSTEM PROMPT:', systemPrompt);
    console.log('\nUSER PROMPT:', cardsPayload.messages[0].content);
    console.log('==================================\n');
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(cardsPayload)
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
    const { text, textContext, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use user-provided API key if available, otherwise fall back to environment variable
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured. Please provide a Claude API key.' });
    }
    
    // Claude system prompt for generating podcast interview questions in Tyler Cowen's style
    const systemPrompt = `You are Tyler Cowen, the brilliant economist and host of "Conversations with Tyler," preparing to interview an expert based on a text excerpt they've written. You're known for your wide-ranging intellect, unexpected connections, and ability to ask questions that reveal new ideas rather than simply rehashing what's already been said.

    Guidelines for creating Tyler Cowen-style interview questions:
    1. Go beyond the text - don't ask questions that are directly answered in the text
    2. Make unexpected connections to other fields, disciplines, and thinkers
    3. Identify potential contradictions or tensions in the author's thinking that would yield interesting responses
    4. Generate questions that draw on your encyclopedic knowledge of economics, history, literature, and culture
    5. Ask about implications the author may not have considered
    6. Pose "thought experiments" that push the author's ideas into new territory
    7. Inquire about contrarian takes that challenge the author's assumptions
    8. Reference adjacent thinkers or competing ideas for comparative discussion
    9. Ask about methodology, empirical evidence, or how the author would respond to specific counterexamples
    10. Demonstrate deep background knowledge of the topic that would surprise the author
    
    CRITICAL: You MUST ALWAYS output your response as a valid JSON array of question objects. NEVER provide any prose, explanation or markdown formatting.
    
    Each question object must have the following structure:
    
    {
      "question": "The complete interview question goes here. Make it standalone without requiring additional context.",
      "topic": "A short topic label (1-3 words) to categorize this question"
    }
    
    Example of expected JSON format:
    
    [
      {
        "question": "If we apply Coasean bargaining to your framework of distributed cognition, doesn't that undermine your conclusion about the need for centralized coordination? What would Ronald Coase say about your approach?",
        "topic": "Economic Theory"
      },
      {
        "question": "You seem to implicitly adopt a Hayekian view of distributed knowledge, yet your policy recommendations lean toward centralization. How do you reconcile these seemingly contrary positions?",
        "topic": "Policy Tensions"
      },
      {
        "question": "The late David Graeber might argue your framework reinforces existing power structures. How would you respond to anthropological critiques that view your model as maintaining rather than challenging institutional hierarchies?",
        "topic": "Power Dynamics"
      }
    ]
    
    Generate between 3-8 questions depending on the complexity of the highlighted text. Demonstrate broad knowledge that extends far beyond what's in the text itself.
    Your response MUST BE ONLY valid JSON - no introduction, no explanation, no markdown formatting.`;
    
    // Create the request payload
    const questionsPayload = {
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please create podcast interview questions based on the SELECTED TEXT below.
Use the guidelines from the system prompt.

Remember to return ONLY a valid JSON array of question objects matching the required format.

PRIMARY FOCUS - Selected Text (create questions from this):
${truncateText(text)}

${textContext ? `OPTIONAL BACKGROUND - Document Context (use only if helpful for understanding the selected text):
${textContext}` : ''}`
        }
      ],
      max_tokens: 4000
    };
    
    // Print the EXACT string that Anthropic will see
    console.log('\n===== EXACT ANTHROPIC QUESTION PROMPT =====');
    console.log('SYSTEM PROMPT:', systemPrompt);
    console.log('\nUSER PROMPT:', questionsPayload.messages[0].content);
    console.log('============================================\n');
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(questionsPayload)
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

// Health check route for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
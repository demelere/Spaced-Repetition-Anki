/**
 * Flash Cards Generator API Server
 * 
 * Provides endpoints for generating flashcards using Claude API
 * and integrating with Mochi Cards
 */

// Load .env file if present (for local development only)
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not installed, continuing without it');
}

// Note: This application can use either server-side API keys from .env
// or client-side API keys passed with each request
// Server-side API key takes precedence if available

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { exec } = require('child_process');

// Import shared prompts and API configuration
const { API_CONFIG } = require('../prompts');

/**
 * Helper function to get the API key to use
 * @param {string} userApiKey - API key provided by client
 * @returns {string} API key to use (server-side preferred)
 */
function getApiKey(userApiKey) {
  // Server-side API key takes precedence if available
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  
  // Fall back to client-provided API key
  if (userApiKey) {
    return userApiKey;
  }
  
  throw new Error('No API key available. Please set ANTHROPIC_API_KEY in your .env file or provide an API key in the request.');
}

/**
 * Helper function to truncate text to a reasonable size
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 8000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
}

/**
 * Helper to call Claude API with consistent options
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {string} apiKey - Claude API key
 * @param {number} maxTokens - Maximum tokens for response
 * @param {number} timeout - Timeout in milliseconds (default: 30 seconds)
 * @returns {Promise<Object>} Claude API response
 */
async function callClaudeApi(systemPrompt, userPrompt, apiKey, maxTokens = 4000, timeout = 30000) {
  if (!apiKey) {
    throw new Error('API key not configured. Please provide a Claude API key.');
  }

  const payload = {
    model: API_CONFIG.CLAUDE_MODEL,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: maxTokens
  };

  // Log the request for debugging
  console.log(`\n===== CLAUDE API REQUEST =====`);
  console.log('SYSTEM:', systemPrompt.substring(0, 100) + '...');
  console.log('USER PROMPT:', userPrompt.substring(0, 100) + '...');
  console.log('TIMEOUT:', timeout + 'ms');
  console.log('==============================\n');

  // Set timeout for API request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout); 

  try {
    const response = await fetch(API_CONFIG.ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_CONFIG.ANTHROPIC_VERSION
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'Unknown Claude API error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || 'Unknown Claude API error';
      } catch (e) {
        errorMessage = await response.text() || 'Could not parse error response';
      }
      throw new Error(`Claude API Error: ${errorMessage}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Claude API request timed out after ${timeout/1000} seconds. Try again or use a smaller text selection.`);
    }
    throw error;
  }
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for clipped text (for extension integration)
// This stores text temporarily until the frontend retrieves it
const clippedTextStorage = new Map();

// SSE clients for real-time notifications
const sseClients = new Set();

// Configure middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://spaced-rep.vercel.app',
    'https://spaced-rep-ten.vercel.app',
    'https://pod-prep.com',
    'https://www.generateflash.cards',
    'https://generateflash.cards',
    new RegExp(/https:\/\/.*\.vercel\.app/)
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../src')));

// Add middleware for request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// EXTENSION INTEGRATION ENDPOINTS

// SSE endpoint for real-time updates
app.get('/api/clipped-texts/stream', (req, res) => {
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write('data: {"type": "connected", "message": "SSE connection established"}\n\n');

  // Add client to connected set
  sseClients.add(res);
  console.log(`SSE client connected. Total clients: ${sseClients.size}`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`SSE client disconnected. Total clients: ${sseClients.size}`);
  });

  // Handle client error
  req.on('error', (error) => {
    console.warn('SSE client error:', error);
    sseClients.delete(res);
  });
});

// API endpoint for receiving clipped text from Obsidian Web Clipper extension
app.post('/api/ingest', async (req, res) => {
  try {
    const { text, source, title, url } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Generate a unique ID for this clipped text
    const clipId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Store the clipped text with metadata
    clippedTextStorage.set(clipId, {
      text: text,
      source: source || 'webpage',
      title: title || 'Clipped Content',
      url: url || '',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expires in 30 minutes
    });
    
    console.log(`Received clipped text (ID: ${clipId}): ${text.length} characters from ${source || 'unknown source'}`);
    
    // Clean up expired entries
    cleanupExpiredClips();
    
    // Notify all connected SSE clients about the new clip
    notifyClients('new-clip', {
      clipId: clipId,
      title: clippedTextStorage.get(clipId).title,
      source: clippedTextStorage.get(clipId).source,
      textLength: clippedTextStorage.get(clipId).text.length,
      timestamp: clippedTextStorage.get(clipId).timestamp
    });
    
    // Automatically open the frontend app in browser
    openFrontendApp(clipId);
    
    res.json({
      success: true,
      clipId: clipId,
      message: 'Text received successfully. The flashcard app will open automatically.',
      appUrl: `http://localhost:${PORT}/?clipId=${clipId}`
    });
    
  } catch (error) {
    console.error('Server error during text ingestion:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// API endpoint for retrieving clipped text by ID
app.get('/api/clipped-text/:clipId', (req, res) => {
  try {
    const { clipId } = req.params;
    
    if (!clipId) {
      return res.status(400).json({ error: 'Clip ID is required' });
    }
    
    const clippedData = clippedTextStorage.get(clipId);
    
    if (!clippedData) {
      return res.status(404).json({ error: 'Clipped text not found or expired' });
    }
    
    // Check if expired
    if (new Date() > new Date(clippedData.expiresAt)) {
      clippedTextStorage.delete(clipId);
      return res.status(404).json({ error: 'Clipped text has expired' });
    }
    
    // Return the clipped data
    res.json({
      success: true,
      data: clippedData
    });
    
  } catch (error) {
    console.error('Server error retrieving clipped text:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// API endpoint to list all available clipped texts
app.get('/api/clipped-texts', (req, res) => {
  try {
    // Clean up expired entries first
    cleanupExpiredClips();
    
    // Return list of available clips
    const clips = Array.from(clippedTextStorage.entries()).map(([id, data]) => ({
      id: id,
      title: data.title,
      source: data.source,
      url: data.url,
      timestamp: data.timestamp,
      textLength: data.text.length
    }));
    
    res.json({
      success: true,
      clips: clips,
      count: clips.length
    });
    
  } catch (error) {
    console.error('Server error listing clipped texts:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// API endpoint to delete a specific clipped text
app.delete('/api/clipped-text/:clipId', (req, res) => {
  try {
    const { clipId } = req.params;
    
    if (!clipId) {
      return res.status(400).json({ error: 'Clip ID is required' });
    }
    
    const deleted = clippedTextStorage.delete(clipId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Clipped text deleted successfully'
      });
    } else {
      res.status(404).json({ error: 'Clipped text not found' });
    }
    
  } catch (error) {
    console.error('Server error deleting clipped text:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// Helper function to clean up expired clips
function cleanupExpiredClips() {
  const now = new Date();
  for (const [id, data] of clippedTextStorage.entries()) {
    if (now > new Date(data.expiresAt)) {
      clippedTextStorage.delete(id);
      console.log(`Cleaned up expired clip: ${id}`);
    }
  }
}

// Function to notify all connected SSE clients
function notifyClients(eventType, data) {
  const message = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.warn('Failed to send SSE message to client:', error);
      // Remove disconnected client
      sseClients.delete(client);
    }
  });
}

// Function to open the frontend app in browser
function openFrontendApp(clipId) {
  const appUrl = `http://localhost:${PORT}/?clipId=${clipId}`;
  
  // Determine the platform and open browser accordingly
  const platform = process.platform;
  let command;
  
  if (platform === 'darwin') {
    // macOS
    command = `open "${appUrl}"`;
  } else if (platform === 'win32') {
    // Windows
    command = `start "${appUrl}"`;
  } else {
    // Linux and others
    command = `xdg-open "${appUrl}"`;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.warn('Failed to open browser automatically:', error);
      console.log(`Please manually open: ${appUrl}`);
    } else {
      console.log(`Opened frontend app in browser: ${appUrl}`);
    }
  });
}

// CLAUDE API ENDPOINTS

// API endpoint for text analysis
app.post('/api/analyze-text', async (req, res) => {
  try {
    const { text, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use user-provided API key only
    const apiKey = getApiKey(userApiKey);
    
    // Truncate text to handle up to 15,000 words (approximately 75,000 characters)
    const truncatedText = truncateText(text, 75000);
    
    const userPrompt = `Please analyze this text and provide a concise contextual summary (1-2 paragraphs maximum):

${truncatedText}`;
    
    const claudeResponse = await callClaudeApi(
      API_CONFIG.PROMPTS.ANALYSIS, 
      userPrompt, 
      apiKey, 
      1000,
      30000 // 30 second timeout for large text analysis
    );
    
    res.json(claudeResponse);
  } catch (error) {
    console.error('Server error during text analysis:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// API endpoint for generating flashcards
app.post('/api/generate-cards', async (req, res) => {
  try {
    const { text, textContext, deckOptions, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use user-provided API key only
    const apiKey = getApiKey(userApiKey);
    
    // Truncate text to handle up to 15,000 words (approximately 75,000 characters)
    const truncatedText = truncateText(text, 75000);
    const truncatedContext = textContext ? truncateText(textContext, 50000) : '';
    
    const userPrompt = `Please create spaced repetition flashcards from the SELECTED TEXT below.
Use the guidelines from the system prompt.

Available deck categories: ${deckOptions || Object.keys(req.body.deckMap || {}).join(', ') || "General"}

Remember to return ONLY a valid JSON array of flashcard objects matching the required format.

PRIMARY FOCUS - Selected Text (create cards from this):
${truncatedText}

${truncatedContext ? `OPTIONAL BACKGROUND - Document Context (extract any relevant context from this to make your cards standalone):
${truncatedContext}` : ''}`;
    
    const claudeResponse = await callClaudeApi(
      API_CONFIG.PROMPTS.CARDS, 
      userPrompt, 
      apiKey, 
      4000,
      60000 // 60 second timeout for large text card generation
    );
    
    // Log the response for debugging
    console.log('Claude API response structure:', Object.keys(claudeResponse));
    if (claudeResponse.content) {
      console.log('Content types:', claudeResponse.content.map(item => item.type).join(', '));
    }
    
    res.json(claudeResponse);
  } catch (error) {
    console.error('Server error during card generation:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// API endpoint for checking server API key configuration
app.get('/api/server-config', (req, res) => {
  res.json({
    hasServerApiKey: !!process.env.ANTHROPIC_API_KEY,
    requiresClientApiKey: !process.env.ANTHROPIC_API_KEY
  });
});

// MOCHI API ENDPOINTS

// API endpoint to fetch decks from Mochi
app.get('/api/mochi-decks', async (req, res) => {
  try {
    // Get Mochi API key from query parameter only
    const mochiApiKey = req.query.userMochiKey;
    if (!mochiApiKey) {
      return res.status(400).json({ 
        error: 'No Mochi API key provided. Please add your API key in settings.',
        fallbackDecks: { "General": "general" }
      });
    }
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
    const base64ApiKey = Buffer.from(`${mochiApiKey}:`).toString('base64');
    const authToken = `Basic ${base64ApiKey}`;
    
    // Set timeout for Vercel serverless functions (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); 
    
    try {
      // Fetch decks from Mochi API
      const response = await fetch('https://app.mochi.cards/api/decks/', {
        method: 'GET',
        headers: {
          'Authorization': authToken
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    
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
      if (error.name === 'AbortError') {
        throw new Error('Mochi API request timed out. Please try again.');
      }
      throw error;
    }
    
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

// API endpoint to check server status
app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'ok',
    clientKeys: true, // This app uses client-side keys, not server environment variables
    timestamp: new Date().toISOString()
  });
});

// REMOVED: Anki export endpoints - now using client-side TSV export only

// API endpoint for direct Mochi integration
app.post('/api/upload-to-mochi', async (req, res) => {
  try {
    const { cards, userMochiKey } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    
    // Get Mochi API key from request only
    const mochiApiKey = userMochiKey;
    if (!mochiApiKey) {
      return res.status(400).json({ error: 'No Mochi API key provided. Please add your API key in settings.' });
    }
    
    console.log('Starting Mochi API upload');
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
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

// UTILITY ENDPOINTS

// Health check route for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API server is running. Remember to add your API keys in the settings.'
  });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// Start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express API for Vercel serverless deployment
module.exports = app;
// Vercel serverless function for generating flashcards
const axios = require('axios');

// Import shared prompts and API configuration
const { API_CONFIG } = require('../prompts');

// Helper function to truncate text
function truncateText(text, maxLength = 8000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
}

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

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, textContext, deckOptions, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Get API key (server-side preferred, fallback to client-provided)
    const apiKey = getApiKey(userApiKey);
    
    const truncatedText = truncateText(text, 8000);
    
    const userPrompt = `Please create spaced repetition flashcards from the SELECTED TEXT below.
Use the guidelines from the system prompt.

Available deck categories: ${deckOptions || "General"}

Remember to return ONLY a valid JSON array of flashcard objects matching the required format.

PRIMARY FOCUS - Selected Text (create cards from this):
${truncatedText}

${textContext ? `OPTIONAL BACKGROUND - Document Context (extract any relevant context from this to make your cards standalone):
${truncateText(textContext, 1500)}` : ''}`;

    const payload = {
      model: API_CONFIG.CLAUDE_MODEL,
      system: API_CONFIG.PROMPTS.CARDS,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4000
    };

    // Call Claude API with reduced timeout to prevent Vercel function timeout
    try {
      const response = await axios({
        method: 'post',
        url: API_CONFIG.ANTHROPIC_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION
        },
        data: payload,
        timeout: 9000 // 9 second timeout to fit within Vercel's 10s limit
      });
      
      return res.status(200).json(response.data);
    } catch (apiError) {
      // Handle axios errors
      if (apiError.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'Request to Claude API timed out. Try a smaller text selection.' });
      }
      
      if (apiError.response) {
        // The request was made and the server responded with a non-2xx status
        return res.status(apiError.response.status).json({ 
          error: `Claude API Error: ${JSON.stringify(apiError.response.data)}`
        });
      } else if (apiError.request) {
        // The request was made but no response was received
        return res.status(500).json({ error: 'No response received from Claude API' });
      } else {
        // Something happened in setting up the request
        return res.status(500).json({ error: `Error setting up request: ${apiError.message}` });
      }
    }
  } catch (error) {
    console.error('Server error during card generation:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
};
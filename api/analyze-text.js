// Vercel serverless function for text analysis
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
    const { text, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Get API key (server-side preferred, fallback to client-provided)
    const apiKey = getApiKey(userApiKey);
    
    const truncatedText = truncateText(text, 10000);
    
    const userPrompt = `Please analyze this text and provide a concise contextual summary (1-2 paragraphs maximum):

${truncatedText}`;

    const payload = {
      model: API_CONFIG.CLAUDE_MODEL,
      system: API_CONFIG.PROMPTS.ANALYSIS,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 1000
    };

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
        timeout: 9000 // 9 second timeout
      });
      
      return res.status(200).json(response.data);
    } catch (apiError) {
      // Handle axios errors
      if (apiError.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'Request to Claude API timed out. Try with a smaller text.' });
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
    console.error('Server error during text analysis:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
};
// Vercel serverless function for text analysis
const axios = require('axios');

// Configuration
const API_CONFIG = {
  ANTHROPIC_API_URL: "https://api.anthropic.com/v1/messages",
  CLAUDE_MODEL: "claude-3-7-sonnet-20250219",
  ANTHROPIC_VERSION: "2023-06-01",
  ANALYSIS_PROMPT: `You analyze text to extract key contextual information. Create a concise 1-2 paragraph summary that includes: the author/source if identifiable, the main thesis or argument, key points, and relevant background. This summary will serve as context for future interactions with sections of this text.`
};

// Helper function to truncate text
function truncateText(text, maxLength = 8000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
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
    
    if (!userApiKey) {
      return res.status(400).json({ error: 'No API key provided. Please add your Claude API key in settings.' });
    }
    
    const truncatedText = truncateText(text, 10000);
    
    const payload = {
      model: API_CONFIG.CLAUDE_MODEL,
      system: API_CONFIG.ANALYSIS_PROMPT,
      messages: [{ 
        role: 'user', 
        content: `Please analyze this text and provide a concise contextual summary (1-2 paragraphs maximum):\n\n${truncatedText}`
      }],
      max_tokens: 1000
    };

    // Call Claude API with timeout
    try {
      const response = await axios({
        method: 'post',
        url: API_CONFIG.ANTHROPIC_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': userApiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION
        },
        data: payload,
        timeout: 15000 // 15 second timeout
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
    console.error('Server error during text analysis:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
};
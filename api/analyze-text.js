// Vercel serverless function for text analysis
const fetch = require('node-fetch');

// Configuration
const API_CONFIG = {
  ANTHROPIC_API_URL: "https://api.anthropic.com/v1/messages",
  CLAUDE_MODEL: "claude-3-7-sonnet-20250219",
  ANTHROPIC_VERSION: "2023-06-01",
  ANALYSIS_PROMPT: `You analyze text to extract key contextual information. Create a concise 1-2 paragraph summary that includes: the author/source if identifiable, the main thesis or argument, key points, and relevant background. This summary will serve as context for future interactions with sections of this text.`
};

// Helper function to truncate text to a reasonable size
function truncateText(text, maxLength = 8000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '... [truncated]';
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
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
    
    // Use user-provided API key only
    const apiKey = userApiKey;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key provided. Please add your API key in settings.' });
    }
    
    const truncatedText = truncateText(text, 10000);
    
    const userPrompt = `Please analyze this text and provide a concise contextual summary (1-2 paragraphs maximum):

${truncatedText}`;
    
    // Set timeout for Vercel serverless functions
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const payload = {
        model: API_CONFIG.CLAUDE_MODEL,
        system: API_CONFIG.ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1000
      };

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
        const errorText = await response.text();
        return res.status(500).json({ error: `Claude API Error: ${errorText}` });
      }

      const claudeResponse = await response.json();
      return res.status(200).json(claudeResponse);
    } catch (apiError) {
      if (apiError.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timed out. Try a smaller text selection.' });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Server error during text analysis:', error);
    return res.status(500).json({ error: error.message });
  }
};
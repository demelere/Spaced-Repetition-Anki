// Vercel serverless function for generating flashcards
const axios = require('axios');

// Configuration
const API_CONFIG = {
  ANTHROPIC_API_URL: "https://api.anthropic.com/v1/messages",
  CLAUDE_MODEL: "claude-3-7-sonnet-20250219",
  ANTHROPIC_VERSION: "2023-06-01",
  CARDS_PROMPT: `You are an expert in creating high-quality spaced repetition flashcards. 
Your task is to generate effective flashcards from the highlighted text excerpt, with the full text provided for context.

Guidelines for creating excellent flashcards:
• Be very concise!
• Focus on core concepts, relationships, and techniques rather than trivia or isolated facts
• Break complex ideas into smaller, atomic concepts
• Ensure each card tests one specific idea (atomic)
• Front of card should ask a specific question that prompts recall
• Back of card should provide a concise, complete answer
• CRITICAL: Make each card standalone and self-contained, with all necessary context included. NEVER use phrases like "according to this text" or "in this selection" since users will see these cards out of context months later
• When referencing the author or source, use their specific name rather than general phrases like "the author" or "this text"

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
Your response MUST BE ONLY valid JSON - no introduction, no explanation, no markdown formatting.`
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
    const { text, textContext, deckOptions, userApiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (!userApiKey) {
      return res.status(400).json({ error: 'No API key provided. Please add your Claude API key in settings.' });
    }
    
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
      system: API_CONFIG.CARDS_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4000
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
        timeout: 25000 // 25 second timeout
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
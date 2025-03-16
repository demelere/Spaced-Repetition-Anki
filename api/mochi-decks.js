// Vercel serverless function for fetching Mochi decks
const fetch = require('node-fetch');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only handle GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Mochi API key from query parameter
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
    
    // Set timeout for Vercel serverless functions
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
        return res.status(500).json({ 
          error: `Mochi API Error: ${errorText}`,
          fallbackDecks: { "General": "general" }
        });
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
      
      return res.status(200).json({
        success: true,
        decks: formattedDecks,
        deckCount: activeDecksCount
      });
    } catch (apiError) {
      if (apiError.name === 'AbortError') {
        return res.status(504).json({ 
          error: 'Mochi API request timed out. Please try again.',
          fallbackDecks: { "General": "general" }
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching Mochi decks:', error);
    return res.status(500).json({ 
      error: error.message,
      fallbackDecks: { "General": "general" }
    });
  }
};
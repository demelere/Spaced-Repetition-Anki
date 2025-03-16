// Vercel serverless function for fetching Mochi decks
const axios = require('axios');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
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
    
    // Always provide fallback decks
    const fallbackDecks = { "General": "general" };
    
    if (!mochiApiKey) {
      return res.status(400).json({ 
        error: 'No Mochi API key provided. Please add your API key in settings.',
        fallbackDecks: fallbackDecks
      });
    }
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
    const authString = `${mochiApiKey}:`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    try {
      // Fetch decks from Mochi API
      const response = await axios({
        method: 'get',
        url: 'https://app.mochi.cards/api/decks/',
        headers: {
          'Authorization': `Basic ${base64Auth}`
        },
        timeout: 5000 // 5 second timeout
      });
      
      // Transform data for client use
      const formattedDecks = {};
      
      if (response.data && response.data.docs) {
        // Filter out trashed and archived decks
        const activeDeckCount = response.data.docs.length;
        let activeDecksCount = 0;
        
        response.data.docs.forEach(deck => {
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
      } else {
        // Invalid response structure
        return res.status(200).json({
          success: true,
          decks: fallbackDecks,
          deckCount: 1,
          message: 'Using fallback deck (General) due to unexpected Mochi API response format'
        });
      }
    } catch (apiError) {
      console.error('Error fetching from Mochi API:', apiError.message);
      
      // Handle axios errors
      if (apiError.code === 'ECONNABORTED') {
        return res.status(200).json({ 
          success: true,
          message: 'Mochi API request timed out. Using fallback decks.',
          decks: fallbackDecks,
          deckCount: 1
        });
      }
      
      // Return fallback decks even on error
      return res.status(200).json({ 
        success: true,
        message: `Error connecting to Mochi: ${apiError.message}. Using fallback decks.`,
        decks: fallbackDecks,
        deckCount: 1
      });
    }
  } catch (error) {
    console.error('Error in Mochi decks endpoint:', error);
    
    // Always return a 200 with fallback decks
    return res.status(200).json({ 
      success: true,
      message: 'Error processing request. Using fallback decks.',
      decks: { "General": "general" },
      deckCount: 1
    });
  }
};
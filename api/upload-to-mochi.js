// Vercel serverless function for uploading cards to Mochi
const axios = require('axios');

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
    const { cards, userMochiKey } = req.body;
    
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    
    if (!userMochiKey) {
      return res.status(400).json({ error: 'No Mochi API key provided. Please add your API key in settings.' });
    }
    
    console.log('Starting Mochi API upload');
    
    // Mochi uses HTTP Basic Auth with API key followed by colon
    const authString = `${userMochiKey}:`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    // Upload each card to Mochi
    const results = [];
    
    for (const card of cards) {
      try {
        // Log limited card info for debugging
        const cardInfo = {
          'content': card.content ? card.content.substring(0, 20) + '...' : 'No content',
          'deck-id': card['deck-id'] || 'No deck ID'
        };
        console.log('Uploading card to Mochi:', JSON.stringify(cardInfo));
        
        try {
          // Make API request with axios
          const response = await axios({
            method: 'post',
            url: 'https://app.mochi.cards/api/cards/',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${base64Auth}`
            },
            data: {
              'content': card.content,
              'deck-id': card['deck-id']
            },
            timeout: 5000 // 5 second timeout
          });
          
          // Successful response
          results.push({ 
            success: true, 
            id: response.data?.id || 'unknown'
          });
        } catch (apiError) {
          // Handle axios errors
          if (apiError.code === 'ECONNABORTED') {
            results.push({ success: false, error: 'Upload timeout. Try again.' });
          } else if (apiError.response) {
            // The request was made and the server responded with a non-2xx status
            results.push({ 
              success: false, 
              error: `Mochi API Error: ${JSON.stringify(apiError.response.data)}`, 
              status: apiError.response.status 
            });
          } else if (apiError.request) {
            // The request was made but no response was received
            results.push({ success: false, error: 'No response received from Mochi API' });
          } else {
            // Something happened in setting up the request
            results.push({ success: false, error: `Error: ${apiError.message}` });
          }
        }
      } catch (cardError) {
        console.error('Error processing card for Mochi upload:', cardError);
        results.push({ success: false, error: `Card processing error: ${cardError.message}` });
      }
    }
    
    return res.status(200).json({
      success: true,
      results: results,
      totalSuccess: results.filter(r => r.success).length,
      totalCards: cards.length
    });
    
  } catch (error) {
    console.error('Server error during Mochi upload:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
};
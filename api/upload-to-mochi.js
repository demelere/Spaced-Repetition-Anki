// Vercel serverless function for uploading cards to Mochi
const fetch = require('node-fetch');

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
        
        // Set timeout for each card upload
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
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
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
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
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            results.push({ success: false, error: 'Upload timeout. Try again.' });
          } else {
            throw fetchError;
          }
        }
      } catch (cardError) {
        console.error('Error uploading to Mochi:', cardError);
        results.push({ success: false, error: cardError.message });
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
    return res.status(500).json({ error: error.message });
  }
};
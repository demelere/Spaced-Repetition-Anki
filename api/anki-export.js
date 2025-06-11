// Vercel serverless function for Anki export functionality
const fs = require('fs').promises;
const path = require('path');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Add cards to the persistent file
      const { cards, append = true } = req.body;
      
      if (!cards || !Array.isArray(cards)) {
        return res.status(400).json({ error: 'Cards array is required' });
      }

      // Format cards for Anki (TSV format)
      const ankiCards = cards.map(card => {
        // Escape tabs and newlines in card content
        const front = (card.front || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
        const back = (card.back || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
        const deck = card.deck || 'Default';
        
        return `${front}\t${back}\t${deck}`;
      });

      // Create TSV content with header
      const tsvContent = append ? ankiCards.join('\n') + '\n' : 
                         'Front\tBack\tDeck\n' + ankiCards.join('\n') + '\n';

      return res.status(200).json({
        success: true,
        content: tsvContent,
        format: 'tsv',
        cardCount: cards.length,
        filename: `anki-cards-${new Date().toISOString().slice(0, 10)}.txt`
      });

    } else if (req.method === 'GET') {
      // Return current accumulated cards info
      return res.status(200).json({
        success: true,
        message: 'Anki export API ready',
        supportedFormats: ['tsv', 'csv']
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Server error during Anki export:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
}; 
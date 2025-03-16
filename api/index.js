// Simple server status check endpoint
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    status: 'ok', 
    message: 'Flash Card Generator API is running',
    endpoints: ['/api/health', '/api/analyze-text', '/api/generate-cards', '/api/mochi-decks', '/api/upload-to-mochi'],
    timestamp: new Date().toISOString() 
  }));
};
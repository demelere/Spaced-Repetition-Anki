// Vercel serverless function for handling TSV file uploads
const formidable = require('formidable');

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const form = new formidable.IncomingForm();
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Check if we have a file in the request
    if (!files || !files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = files.file;
    
    // Validate file type
    if (!uploadedFile.mimetype.includes('text/') && 
        !uploadedFile.originalFilename.endsWith('.tsv') && 
        !uploadedFile.originalFilename.endsWith('.txt')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a TSV or text file.' });
    }

    // Read the file content
    const fs = require('fs');
    const fileContent = fs.readFileSync(uploadedFile.filepath, 'utf8');
    
    // Parse TSV content
    const lines = fileContent.trim().split('\n');
    if (lines.length === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }

    // Parse cards from TSV format
    const cards = [];
    const hasHeader = lines[0].toLowerCase().includes('front') && lines[0].toLowerCase().includes('back');
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('\t');
      if (parts.length >= 2) {
        const front = parts[0].replace(/<br>/g, '\n').trim();
        const back = parts[1].replace(/<br>/g, '\n').trim();
        const deck = parts[2] || 'General';

        if (front && back) {
          cards.push({
            front: front,
            back: back,
            deck: deck
          });
        }
      }
    }

    if (cards.length === 0) {
      return res.status(400).json({ error: 'No valid cards found in the file' });
    }

    // Generate a filename based on the original file name
    const originalName = uploadedFile.originalFilename.replace(/\.(tsv|txt)$/i, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${originalName}-${timestamp}.txt`;

    // Clean up the temporary file
    fs.unlinkSync(uploadedFile.filepath);

    // Return the parsed cards and filename
    return res.status(200).json({
      success: true,
      cards: cards,
      cardCount: cards.length,
      filename: filename,
      message: `Successfully parsed ${cards.length} cards from ${uploadedFile.originalFilename}`
    });

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    return res.status(500).json({ error: `Failed to process file: ${error.message}` });
  }
}; 
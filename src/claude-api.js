// Configuration for Claude API
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-7-sonnet-20250219"; // Using the latest model version
const API_KEY_STORAGE_KEY = "mochi_card_generator_api_keys";

// Helper functions for API key management
function getStoredApiKeys() {
    try {
        const storedData = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (error) {
        console.error('Error reading stored API keys:', error);
    }
    return { anthropicApiKey: null, mochiApiKey: null };
}

function storeApiKeys(anthropicApiKey, mochiApiKey, storeLocally = true) {
    if (storeLocally) {
        try {
            localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({
                anthropicApiKey,
                mochiApiKey
            }));
            return true;
        } catch (error) {
            console.error('Error storing API keys:', error);
            return false;
        }
    } else {
        // If not storing locally, clear any existing keys
        try {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing API keys:', error);
        }
        return true;
    }
}

function clearStoredApiKeys() {
    try {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing API keys:', error);
        return false;
    }
}

// API key validation helper
function validateAnthropicApiKey(key) {
    return key && key.startsWith('sk-ant-') && key.length > 20;
}

// Check if API keys are configured
function hasApiKeys() {
    const keys = getStoredApiKeys();
    return !!keys.anthropicApiKey;
}

// The prompt instructions to guide Claude in generating high-quality flashcards
// Based on principles from Michael Nielsen and Andy Matuschak
const SYSTEM_PROMPT = `You are an expert in creating high-quality spaced repetition flashcards. 
Your task is to generate effective flashcards from the provided text excerpt.

Guidelines for creating excellent flashcards:
1. Focus on core concepts and relationships rather than trivia or isolated facts
2. Break complex ideas into smaller, atomic concepts
3. Ensure each card tests one specific idea (atomic)
4. Use precise, clear language
5. Front of card should ask a specific question that prompts recall
6. Back of card should provide a concise, complete answer
7. Avoid creating cards that can be answered through pattern matching or recognition
8. Create cards that build conceptual understanding and connections
9. Focus on "why" and "how" questions that develop deeper understanding
10. Promote connections between concepts across domains when relevant

You will also analyze the content and suggest an appropriate deck category from these options:
- CS/Hardware
- Math/Physics
- AI/Alignment
- History/Military/Current
- Quotes/Random
- Bio
- Econ/Finance

Output format:
For each card you generate, provide:
1. A 'front' field with the question/prompt
2. A 'back' field with the answer/explanation
3. A 'deck' field with one of the categories listed above

Generate between 1-5 cards depending on the complexity and amount of content in the text.`;

/**
 * Analyzes text to extract key context information
 * Returns a concise summary of the document's main points and author
 * 
 * @param {string} text - The full text to analyze
 * @returns {Promise<string>} - Context summary
 */
async function analyzeTextWithClaude(text) {
    try {
        // Get stored API keys
        const { anthropicApiKey } = getStoredApiKeys();
        
        // Call the server endpoint for text analysis
        const response = await fetch('/api/analyze-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                userApiKey: anthropicApiKey || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        
        // Extract the context summary from Claude's response
        let contextSummary = '';
        if (data.content && Array.isArray(data.content)) {
            for (const item of data.content) {
                if (item.type === 'text') {
                    contextSummary += item.text;
                }
            }
        }
        
        return contextSummary;
    } catch (error) {
        console.error('Error analyzing text:', error);
        throw error;
    }
}

/**
 * Calls Claude API to generate flashcards from text
 * Uses server-side proxy with user-provided API key
 * 
 * @param {string} text - The highlighted text selection to create cards from
 * @param {string} deckOptions - Comma-separated list of available deck options
 * @param {string} textContext - Optional context summary for the document
 * @returns {Promise<Array>} - Array of card objects with front, back, and deck properties
 */
async function generateCardsWithClaude(text, deckOptions = '', textContext = '') {
    try {
        // Get stored API keys
        const { anthropicApiKey } = getStoredApiKeys();
        
        // Call the server endpoint, passing the API key in the request if available
        const response = await fetch('/api/generate-cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                textContext,
                deckOptions,
                userApiKey: anthropicApiKey || null // Send user's API key to the server
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('Raw response data:', data);
        
        // Parse Claude's response to extract cards
        return parseClaudeResponse(data);
    } catch (error) {
        console.error('Error calling API:', error);
        
        // Check if this might be a CORS error
        if (error.message && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Unable to connect to the API service. This may be due to CORS restrictions or the server being unavailable. Please try again later or contact support.');
        }
        
        throw error;
    }
}

/**
 * Parses Claude's response to extract structured card data
 * This function handles various response formats from Claude
 * 
 * @param {object} responseData - The response from Claude
 * @returns {Array} - Array of card objects
 */
function parseClaudeResponse(responseData) {
    console.log('Claude response:', responseData);
    
    let responseText = '';
    
    // Extract text content from response
    if (responseData.content && Array.isArray(responseData.content)) {
        for (const item of responseData.content) {
            if (item.type === 'text') {
                responseText += item.text;
            }
        }
    } else if (responseData.content && responseData.content[0] && responseData.content[0].text) {
        responseText = responseData.content[0].text;
    } else {
        console.warn('Unexpected response format from Claude API');
        responseText = JSON.stringify(responseData);
    }
    
    console.log('Raw text response from Claude:', responseText);
    
    // Try to parse as JSON
    try {
        // First, extract JSON if it's embedded in other text
        // Look for anything that might be JSON array
        const jsonMatch = responseText.match(/(\[\s*\{.*\}\s*\])/s);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        
        // Parse the JSON
        const parsedCards = JSON.parse(jsonText);
        console.log('Successfully parsed JSON cards:', parsedCards);
        
        // Validate the parsed data is an array with the expected structure
        if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            // Validate each card has required fields
            const validCards = parsedCards.filter(card => {
                return card.front && card.back;
            });
            
            // Ensure all cards have a deck (default to "General" if missing)
            const normalizedCards = validCards.map(card => ({
                front: card.front,
                back: card.back,
                deck: card.deck || "General"
            }));
            
            if (normalizedCards.length > 0) {
                console.log('Returning valid JSON cards:', normalizedCards);
                return normalizedCards;
            }
        }
        console.warn('Parsed JSON did not contain valid cards');
    } catch (error) {
        console.warn('Failed to parse response as JSON:', error);
        
        // Try searching for JSON inside the text (sometimes Claude wraps JSON in backticks or other text)
        try {
            const jsonRegex = /```(?:json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/;
            const match = responseText.match(jsonRegex);
            if (match && match[1]) {
                const extractedJson = match[1];
                const parsedCards = JSON.parse(extractedJson);
                
                if (Array.isArray(parsedCards) && parsedCards.length > 0) {
                    const validCards = parsedCards.filter(card => {
                        return card.front && card.back;
                    }).map(card => ({
                        front: card.front,
                        back: card.back,
                        deck: card.deck || "General"
                    }));
                    
                    if (validCards.length > 0) {
                        console.log('Returning valid JSON cards (extracted from code block):', validCards);
                        return validCards;
                    }
                }
            }
        } catch (innerError) {
            console.warn('Failed to extract JSON from code blocks:', innerError);
        }
    }
    
    // Fallback: If JSON parsing fails, create a basic fallback card
    console.warn('Could not parse any cards from Claude response, using fallback');
    
    return [{
        front: "What are the key concepts from this text?",
        back: responseText.length > 300 
            ? responseText.substring(0, 300) + "..." 
            : responseText,
        deck: "General"
    }];
}

/**
 * Placeholder for backward compatibility - no longer used but kept to prevent import errors
 */
function generateQuestionsWithClaude() {
    console.warn('Question generation is no longer supported');
    return Promise.resolve([]);
}

export { 
    generateCardsWithClaude,
    generateQuestionsWithClaude, // Kept for backward compatibility
    analyzeTextWithClaude,
    getStoredApiKeys,
    storeApiKeys,
    validateAnthropicApiKey,
    hasApiKeys
};
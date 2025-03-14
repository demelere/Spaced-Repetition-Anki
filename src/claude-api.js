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
 * Calls Claude API to generate flashcards from text
 * Uses server-side proxy with user-provided API key
 * 
 * @param {string} text - The highlighted text selection to create cards from
 * @param {string} deckOptions - Comma-separated list of available deck options
 * @param {string} fullText - Optional full text for context
 * @returns {Promise<Array>} - Array of card objects with front, back, and deck properties
 */
async function generateCardsWithClaude(text, deckOptions = '', fullText = '') {
    try {
        // Get stored API keys
        const { anthropicApiKey } = getStoredApiKeys();
        
        // Use the provided fullText for context, or fallback to the text input's full content
        const contextText = fullText;
        
        // Call the server endpoint, passing the API key in the request if available
        const response = await fetch('/api/generate-cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                fullText: contextText,
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
 * Calls Claude API to generate interview questions from text
 * Uses server-side proxy with user-provided API key
 * 
 * @param {string} text - The highlighted text selection to create questions from
 * @param {string} fullText - Optional full text for context
 * @returns {Promise<Array>} - Array of question objects with question, notes, and topic properties
 */
async function generateQuestionsWithClaude(text, fullText = '') {
    try {
        // Get stored API keys
        const { anthropicApiKey } = getStoredApiKeys();
        
        // Use the full text if provided, otherwise use the highlighted text for both
        const contextText = fullText || document.getElementById('textInput').value || text;
        
        // Call the server endpoint, passing the API key in the request if available
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                fullText: contextText,
                userApiKey: anthropicApiKey || null // Send user's API key to the server
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('Raw questions response data:', data);
        
        // Parse Claude's response to extract questions
        return parseQuestionsResponse(data);
    } catch (error) {
        console.error('Error calling questions API:', error);
        
        // Check if this might be a CORS error
        if (error.message && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Unable to connect to the API service. This may be due to CORS restrictions or the server being unavailable. Please try again later or contact support.');
        }
        
        throw error;
    }
}

// Chat function removed

/**
 * Parses Claude's response to extract structured card data
 * This function needs to be adapted based on how Claude formats its response
 * 
 * @param {string} responseText - The text response from Claude
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
 * Parses Claude's response to extract structured question data
 * Enhanced with more robust JSON parsing and fallback mechanisms
 * 
 * @param {Object} responseData - The raw response from Claude
 * @returns {Array} - Array of question objects
 */
function parseQuestionsResponse(responseData) {
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
    
    console.log('Raw text response from Claude (questions):', responseText);
    
    // If we have no text at all, return a fallback immediately
    if (!responseText || responseText.trim().length === 0) {
        console.error('Empty response from Claude API for questions');
        return [{
            question: "No response generated. Please try again with different text.",
            topic: "Error"
        }];
    }
    
    // Try multiple approaches to extract JSON
    
    // Method 1: Direct JSON parsing if the entire response is valid JSON
    try {
        const parsedQuestions = JSON.parse(responseText);
        if (isValidQuestionArray(parsedQuestions)) {
            return normalizeQuestions(parsedQuestions);
        }
    } catch (error) {
        console.warn('Response is not directly parseable as JSON:', error.message);
    }
    
    // Method 2: Look for JSON array pattern in the text
    try {
        const jsonMatch = responseText.match(/(\[\s*\{\s*"question"[\s\S]*?\}\s*\])/s);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedQuestions = JSON.parse(jsonMatch[1]);
                if (isValidQuestionArray(parsedQuestions)) {
                    return normalizeQuestions(parsedQuestions);
                }
            } catch (innerError) {
                console.warn('Matched JSON-like text is not valid JSON:', innerError.message);
            }
        }
    } catch (error) {
        console.warn('Error during regex matching for JSON array:', error.message);
    }
    
    // Method 3: Look for code blocks that might contain JSON
    try {
        const codeBlockMatches = responseText.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
        for (const match of codeBlockMatches) {
            try {
                const extractedJson = match[1].trim();
                const parsedQuestions = JSON.parse(extractedJson);
                if (isValidQuestionArray(parsedQuestions)) {
                    return normalizeQuestions(parsedQuestions);
                }
            } catch (jsonError) {
                console.warn('Code block does not contain valid JSON:', jsonError.message);
            }
        }
    } catch (error) {
        console.warn('Error extracting JSON from code blocks:', error.message);
    }
    
    // Method 4: Try to construct questions from the text if it contains question-like content
    // This is a more aggressive fallback that tries to salvage something from the text
    try {
        // Look for lines that seem like questions (ending with ?)
        const lines = responseText.split('\n');
        const potentialQuestions = [];
        
        let currentQuestion = '';
        let currentTopic = 'General';
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Look for "topic:" or "category:" labels
            const topicMatch = trimmedLine.match(/^(topic|category):\s*(.*)/i);
            if (topicMatch) {
                currentTopic = topicMatch[2].trim();
                continue;
            }
            
            // If line has a question mark, treat it as a question
            if (trimmedLine.includes('?')) {
                // If we already have a current question, save it before starting a new one
                if (currentQuestion) {
                    potentialQuestions.push({
                        question: currentQuestion,
                        topic: currentTopic
                    });
                }
                
                currentQuestion = trimmedLine;
                continue;
            }
            
            // If line starts with a number followed by period, it might be a numbered list item
            if (/^\d+\.\s/.test(trimmedLine)) {
                const textAfterNumber = trimmedLine.replace(/^\d+\.\s/, '').trim();
                
                // If we already have a current question, save it before starting a new one
                if (currentQuestion) {
                    potentialQuestions.push({
                        question: currentQuestion,
                        topic: currentTopic
                    });
                }
                
                currentQuestion = textAfterNumber;
                continue;
            }
            
            // If it's not a new question, append to the current one
            if (currentQuestion) {
                currentQuestion += ' ' + trimmedLine;
            } else {
                // Start a new question if we don't have one
                currentQuestion = trimmedLine;
            }
        }
        
        // Add the last question if there is one
        if (currentQuestion) {
            potentialQuestions.push({
                question: currentQuestion,
                topic: currentTopic
            });
        }
        
        // If we found any potential questions, return them
        if (potentialQuestions.length > 0) {
            console.log('Created questions by parsing text content:', potentialQuestions);
            return potentialQuestions;
        }
    } catch (error) {
        console.warn('Error during text-based question extraction:', error);
    }
    
    // Final fallback: create a default question with a snippet of the response
    console.warn('Could not parse any questions from Claude response, using fallback');
    
    return [{
        question: "What are the key points from this text that would be interesting to discuss?",
        topic: "General"
    }, {
        question: "Based on the text, what follow-up questions could you ask?",
        topic: "General"
    }];
}

// Helper functions for the enhanced parser
function isValidQuestionArray(data) {
    return Array.isArray(data) && data.length > 0 && 
           data.some(q => q && typeof q === 'object' && q.question);
}

function normalizeQuestions(questions) {
    // Validate each question has required fields and normalize the format
    const normalized = questions.filter(q => q && q.question)
        .map(q => ({
            question: q.question,
            topic: q.topic || "General"
        }));
    
    if (normalized.length > 0) {
        console.log('Returning normalized questions:', normalized);
        return normalized;
    }
    
    return null; // Signal to continue with other methods
}

export { 
    generateCardsWithClaude,
    generateQuestionsWithClaude,
    getStoredApiKeys,
    storeApiKeys,
    clearStoredApiKeys,
    validateAnthropicApiKey,
    hasApiKeys
};
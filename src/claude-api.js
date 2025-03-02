// Configuration for Claude API
// The API key will be loaded from the server environment
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-7-sonnet-20240229"; // Update this with the latest model version

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
 * @param {string} text - The text selection to create cards from
 * @param {string} defaultDeck - The default deck category to use if Claude doesn't specify one
 * @returns {Promise<Array>} - Array of card objects with front, back, and deck properties
 */
async function generateCardsWithClaude(text, defaultDeck) {
    try {
        // Call the server endpoint that handles the API key safely
        const response = await fetch('/api/generate-cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                defaultDeck
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('Raw response data:', data);
        
        // Parse Claude's response to extract cards
        return parseClaudeResponse(data, defaultDeck);
    } catch (error) {
        console.error('Error calling API:', error);
        throw error;
    }
}

/**
 * Parses Claude's response to extract structured card data
 * This function needs to be adapted based on how Claude formats its response
 * 
 * @param {string} responseText - The text response from Claude
 * @param {string} defaultDeck - Default deck to use if not specified
 * @returns {Array} - Array of card objects
 */
function parseClaudeResponse(responseData, defaultDeck) {
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
                return card.front && card.back && 
                       (card.deck || defaultDeck);
            });
            
            // Use default deck if needed
            const normalizedCards = validCards.map(card => ({
                front: card.front,
                back: card.back,
                deck: card.deck || defaultDeck
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
                        return card.front && card.back && 
                               (card.deck || defaultDeck);
                    }).map(card => ({
                        front: card.front,
                        back: card.back,
                        deck: card.deck || defaultDeck
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
        deck: defaultDeck
    }];
}

export { generateCardsWithClaude };
// Import Claude API functions
import { generateCardsWithClaude } from './claude-api.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const textInput = document.getElementById('textInput');
    const pasteButton = document.getElementById('pasteButton');
    const clearButton = document.getElementById('clearButton');
    const generateButton = document.getElementById('generateButton');
    const defaultDeckSelect = document.getElementById('defaultDeck');
    const cardsContainer = document.getElementById('cardsContainer');
    const exportButton = document.getElementById('exportButton');
    const clearCardsButton = document.getElementById('clearCardsButton');
    const cardCountElement = document.getElementById('cardCount');
    
    // App State
    const state = {
        cards: [],
        decks: {
            "CS/Hardware": "[[rhGqR9SK]]",
            "Math/Physics": "[[Dm5vczZg]]",
            "AI/Alignment": "[[SS9QEfiy]]",
            "History/Military/Current": "[[3nJYp7Zh]]",
            "Quotes/Random": "[[rWUzSu8t]]",
            "Bio": "[[BspzxaUJ]]",
            "Econ/Finance": "[[mvvJ27Q1]]"
        }
    };
    
    // Event Listeners
    pasteButton.addEventListener('click', pasteFromClipboard);
    clearButton.addEventListener('click', clearTextInput);
    generateButton.addEventListener('click', generateCardsFromSelection);
    exportButton.addEventListener('click', exportToMochi);
    clearCardsButton.addEventListener('click', clearAllCards);
    
    // Monitor text selection
    textInput.addEventListener('mouseup', handleTextSelection);
    textInput.addEventListener('keyup', handleTextSelection);

    // Enable the button if there's already text in the selection
    handleTextSelection();
    
    // Prevent scrolling the page when mouse wheel is used over the text input
    textInput.addEventListener('wheel', function(e) {
        const contentHeight = this.scrollHeight;
        const visibleHeight = this.clientHeight;
        const scrollTop = this.scrollTop;
        
        // Check if we're at the top or bottom boundary
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + visibleHeight >= contentHeight - 1;
        
        // If we're at a boundary and trying to scroll further in that direction, 
        // let the page scroll normally
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            return;
        }
        
        // Otherwise, scroll the text input and prevent page scrolling
        e.preventDefault();
        this.scrollTop += e.deltaY;
    }, { passive: false });
    
    // Functions
    function pasteFromClipboard() {
        // Access clipboard and paste with formatting
        navigator.clipboard.readText()
            .then(text => {
                // For direct button click paste, we'll try to preserve markdown-like formatting
                
                // Clear the input first
                textInput.innerHTML = '';
                
                // Convert plain text with markdown-like syntax to HTML
                let formattedHtml = convertMarkdownToHtml(text);
                
                // Insert as HTML to preserve basic formatting
                textInput.innerHTML = formattedHtml;
                
                // Check for selection
                handleTextSelection();
            })
            .catch(err => {
                console.error('Failed to read clipboard contents: ', err);
                alert('Cannot access clipboard. Please paste manually or use Ctrl+V/Cmd+V.');
            });
    }
    
    // Simple function to convert markdown-like syntax to basic HTML
    function convertMarkdownToHtml(text) {
        // This is a very basic implementation
        // Headings (# Heading)
        text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        
        // Lists (- item)
        text = text.replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
        
        // Bold (**bold**)
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic (*italic*)
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Paragraphs (double newlines)
        text = text.replace(/\n\n/g, '</p><p>');
        
        // Wrap in paragraphs if not already
        if (!text.startsWith('<h') && !text.startsWith('<ul')) {
            text = '<p>' + text + '</p>';
        }
        
        return text;
    }
    
    // Now allow regular paste with formatting
    textInput.addEventListener('paste', function(e) {
        // Let the browser handle the paste with formatting
        // But we'll clean it up after
        
        // Need to wait for the paste to complete
        setTimeout(() => {
            // Clean up problematic elements
            const images = textInput.querySelectorAll('img, video, iframe, object, embed');
            images.forEach(img => img.remove());
            
            // Clean up styles that might be problematic
            const allElements = textInput.querySelectorAll('*');
            allElements.forEach(el => {
                // Keep element but remove problematic attributes
                el.removeAttribute('id');
                el.removeAttribute('class');
                el.style.fontFamily = '';
                el.style.fontSize = '';
                el.style.color = '';
                el.style.backgroundColor = '';
            });
            
            handleTextSelection();
        }, 0);
    });
    
    function clearTextInput() {
        textInput.innerHTML = '';
        generateButton.disabled = true;
    }
    
    function handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Log for debugging
        console.log('Text selected:', selectedText.length > 0 ? 'Yes' : 'No');
        
        // Enable/disable button based on selection
        generateButton.disabled = selectedText.length === 0;
    }
    
    async function generateCardsFromSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            alert('Please select some text first.');
            return;
        }
        
        const defaultDeck = defaultDeckSelect.value;
        
        try {
            // Update UI to show processing state
            generateButton.disabled = true;
            generateButton.textContent = 'Generating...';
            
            // Store current selection for highlighting after API call
            const savedRange = selection.getRangeAt(0).cloneRange();
            
            // Get cards from Claude API
            const cards = await callClaudeAPI(selectedText, defaultDeck);
            
            // Add generated cards to state
            state.cards = [...state.cards, ...cards];
            
            // Render all cards
            renderCards();
            
            // Update buttons state
            updateButtonStates();
            
            // Highlight the selection (after API call completes)
            highlightSelection();
            
        } catch (error) {
            console.error('Error generating cards:', error);
            alert('Error generating cards: ' + (error.message || 'Please try again.'));
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Cards from Selection';
        }
    }
    
    function highlightSelection() {
        // Get the current selection
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // Create a temporary marker for the selection
        const marker = document.createElement('mark');
        marker.className = 'highlight';
        marker.style.backgroundColor = '#ffe066';
        marker.style.padding = '0';
        marker.style.margin = '0';
        marker.style.borderRadius = '2px';
        
        try {
            // Get the range of the current selection
            const range = selection.getRangeAt(0);
            
            // Check if the range is within our text input
            if (!textInput.contains(range.commonAncestorContainer)) {
                return;
            }
            
            // Clone the range to avoid modifying the selection directly
            const clonedRange = range.cloneRange();
            
            // Create a fragment of the selection
            const contents = clonedRange.extractContents();
            
            // Add the contents to our marker
            marker.appendChild(contents);
            
            // Insert the marker at the position of the selection
            clonedRange.insertNode(marker);
            
            // Clear the selection
            selection.removeAllRanges();
        } catch (e) {
            console.warn('Could not highlight selection:', e);
        }
    }
    
    function renderCards() {
        cardsContainer.innerHTML = '';
        
        state.cards.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            cardsContainer.appendChild(cardElement);
        });
        
        // Update card count
        cardCountElement.textContent = `(${state.cards.length})`;
    }
    
    function createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        // Sanitize the card data to ensure it's rendered properly
        const sanitizeHtml = (text) => {
            // Create a temporary div
            const tempDiv = document.createElement('div');
            // Set the text content (this escapes HTML)
            tempDiv.textContent = text;
            // Return the sanitized HTML
            return tempDiv.innerHTML;
        };
        
        // Ensure the content is properly formatted strings, not JSON objects
        const front = typeof card.front === 'string' ? sanitizeHtml(card.front) : sanitizeHtml(JSON.stringify(card.front));
        const back = typeof card.back === 'string' ? sanitizeHtml(card.back) : sanitizeHtml(JSON.stringify(card.back));
        const deck = typeof card.deck === 'string' ? sanitizeHtml(card.deck) : sanitizeHtml(JSON.stringify(card.deck));
        
        cardDiv.innerHTML = `
            <div class="card-header">
                <span>Card #${index + 1}</span>
                <span class="card-deck">${deck}</span>
            </div>
            <div class="card-content">
                <div class="card-front">
                    <div class="card-label">Front:</div>
                    <div class="card-text" contenteditable="true">${front}</div>
                </div>
                <div class="card-back">
                    <div class="card-label">Back:</div>
                    <div class="card-text" contenteditable="true">${back}</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="edit-deck-button">Change Deck</button>
                <button class="delete-button" data-index="${index}">Delete</button>
            </div>
        `;
        
        // Add event listeners
        const deleteButton = cardDiv.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => deleteCard(index));
        
        const editDeckButton = cardDiv.querySelector('.edit-deck-button');
        editDeckButton.addEventListener('click', () => editCardDeck(index));
        
        // Make card content editable
        const frontText = cardDiv.querySelector('.card-front .card-text');
        const backText = cardDiv.querySelector('.card-back .card-text');
        
        frontText.addEventListener('blur', () => {
            // Get text content instead of innerHTML to avoid HTML injection
            state.cards[index].front = frontText.textContent;
        });
        
        backText.addEventListener('blur', () => {
            // Get text content instead of innerHTML to avoid HTML injection
            state.cards[index].back = backText.textContent;
        });
        
        return cardDiv;
    }
    
    function deleteCard(index) {
        state.cards.splice(index, 1);
        renderCards();
        updateButtonStates();
    }
    
    function editCardDeck(index) {
        const card = state.cards[index];
        const deckNames = Object.keys(state.decks);
        
        const newDeck = prompt(
            `Select a deck for this card:\n${deckNames.join('\n')}`, 
            card.deck
        );
        
        if (newDeck && deckNames.includes(newDeck)) {
            card.deck = newDeck;
            renderCards();
        }
    }
    
    function updateButtonStates() {
        const hasCards = state.cards.length > 0;
        exportButton.disabled = !hasCards;
        clearCardsButton.disabled = !hasCards;
    }
    
    function clearAllCards() {
        if (confirm('Are you sure you want to clear all cards?')) {
            state.cards = [];
            renderCards();
            updateButtonStates();
        }
    }
    
    function exportToMochi() {
        const mochiData = formatCardsForMochi();
        downloadMochiExport(mochiData);
    }
    
    function formatCardsForMochi() {
        // Group cards by deck
        const deckMap = {};
        
        state.cards.forEach(card => {
            const deckId = state.decks[card.deck];
            if (!deckMap[deckId]) {
                deckMap[deckId] = [];
            }
            
            deckMap[deckId].push({
                content: `${card.front}\n\n---\n\n${card.back}`
            });
        });
        
        // Format according to Mochi's JSON format
        const data = {
            version: 2,
            cards: []
        };
        
        // Add cards with their deck IDs
        for (const [deckId, cards] of Object.entries(deckMap)) {
            cards.forEach(card => {
                data.cards.push({
                    ...card,
                    'deck-id': deckId.replace(/\[\[|\]\]/g, '') // Remove [[ ]] if needed
                });
            });
        }
        
        return JSON.stringify(data, null, 2);
    }
    
    function downloadMochiExport(data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spaced-rep-cards-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    
    // Call the real API or use mock implementation based on MOCK_API setting
    async function callClaudeAPI(text, defaultDeck) {
        // For development (mock implementation)
        console.log('Calling Claude API (mock) with:', { text, defaultDeck });
        
        // Set MOCK_API to false to use the real Claude API
        const MOCK_API = false;
        
        if (MOCK_API) {
            // Return mock data after a delay to simulate API call
            return new Promise(resolve => {
                setTimeout(() => {
                    // Generate different mock cards based on the text content to simulate intelligence
                    let mockCards = [];
                    
                    // Very basic content analysis for more realistic mock responses
                    const lowerText = text.toLowerCase();
                    
                    if (lowerText.includes('algorithm') || lowerText.includes('code') || lowerText.includes('program')) {
                        mockCards.push({
                            front: "What is the key algorithm concept described in the text?",
                            back: "The text discusses " + text.substring(0, 50) + "...",
                            deck: "CS/Hardware"
                        });
                    } else if (lowerText.includes('physics') || lowerText.includes('equation') || lowerText.includes('math')) {
                        mockCards.push({
                            front: "What is the mathematical relationship described in the text?",
                            back: "The text explains that " + text.substring(0, 50) + "...",
                            deck: "Math/Physics"
                        });
                    } else if (lowerText.includes('ai') || lowerText.includes('machine learning') || lowerText.includes('neural')) {
                        mockCards.push({
                            front: "What AI concept is being explained in the passage?",
                            back: "The passage describes " + text.substring(0, 50) + "...",
                            deck: "AI/Alignment"
                        });
                    } else {
                        // Default cards if no specific topic is detected
                        mockCards.push({
                            front: "What is the main idea of the selected text?",
                            back: "The text discusses " + text.substring(0, 50) + "...",
                            deck: defaultDeck
                        });
                    }
                    
                    // Always add a second generic card
                    mockCards.push({
                        front: "Why is the concept in this text significant?",
                        back: "Its significance lies in " + text.substring(0, 30) + "...",
                        deck: defaultDeck
                    });
                    
                    resolve(mockCards);
                }, 1500);
            });
        } else {
            try {
                // Call the actual Claude API
                console.log('Calling real Claude API...');
                return await generateCardsWithClaude(text, defaultDeck);
            } catch (error) {
                console.error('Error using Claude API:', error);
                alert('Error calling Claude API. Using fallback data instead.');
                
                // Fallback to basic data if API fails
                return [
                    {
                        front: "What is the main concept in the text?",
                        back: "The text explains " + text.substring(0, 40) + "...",
                        deck: defaultDeck
                    }
                ];
            }
        }
    }
});
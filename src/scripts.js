// Import Claude API functions
import { generateCardsWithClaude, generateQuestionsWithClaude } from './claude-api.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const textInput = document.getElementById('textInput');
    const generateButton = document.getElementById('generateButton');
    const generateQuestionsButton = document.getElementById('generateQuestionsButton');
    const cardsContainer = document.getElementById('cardsContainer');
    const questionsContainer = document.getElementById('questionsContainer');
    const exportButton = document.getElementById('exportButton');
    const exportQuestionsButton = document.getElementById('exportQuestionsButton');
    const clearCardsButton = document.getElementById('clearCardsButton');
    const clearQuestionsButton = document.getElementById('clearQuestionsButton');
    const cardCountElement = document.getElementById('cardCount');
    const questionCountElement = document.getElementById('questionCount');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const cardsControlGroup = document.getElementById('cards-controls');
    const questionsControlGroup = document.getElementById('questions-controls');
    const splitterHandle = document.querySelector('.splitter-handle');
    const defaultDeckDisplay = document.getElementById('defaultDeckDisplay');
    
    // App State
    const state = {
        cards: [],
        questions: [],
        selectedText: '',
        // Default deck used for all cards
        defaultDeck: "AI/Alignment",
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
    generateButton.addEventListener('click', generateCardsFromSelection);
    generateQuestionsButton.addEventListener('click', generateQuestionsFromSelection);
    exportButton.addEventListener('click', exportToMochi);
    exportQuestionsButton.addEventListener('click', exportQuestions);
    clearCardsButton.addEventListener('click', clearAllCards);
    clearQuestionsButton.addEventListener('click', clearAllQuestions);
    
    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchToTab(tabId);
        });
    });
    
    function switchToTab(tabId) {
        // Find the tab button
        const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (!tabButton) return;
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Remove active class from all control groups
        document.querySelectorAll('.tab-control-group').forEach(group => {
            group.classList.remove('active');
        });
        
        // Add active class to current button and content
        tabButton.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        // Toggle corresponding control group and update generate button visibility
        if (tabId === 'cards-tab') {
            document.getElementById('cards-controls').classList.add('active');
            generateButton.style.display = 'block';
            generateQuestionsButton.style.display = 'none';
        } else if (tabId === 'questions-tab') {
            document.getElementById('questions-controls').classList.add('active');
            generateButton.style.display = 'none';
            generateQuestionsButton.style.display = 'block';
        }
    }
    
    // Add plain text paste handlers
    textInput.addEventListener('paste', handlePaste);
    
    // Monitor text selection
    textInput.addEventListener('mouseup', handleTextSelection);
    textInput.addEventListener('keyup', handleTextSelection);
    
    // Periodic check for selections (helps with some edge cases)
    setInterval(handleTextSelection, 500);

    // Enable the button if there's already text in the selection
    handleTextSelection();
    
    // Initialize UI
    updateButtonStates();
    
    // Set up default deck display and make it clickable to change
    defaultDeckDisplay.textContent = state.defaultDeck;
    defaultDeckDisplay.addEventListener('click', changeDefaultDeck);
    
    // Function to change the default deck
    function changeDefaultDeck() {
        const deckNames = Object.keys(state.decks);
        
        const newDefaultDeck = prompt(
            `Select a default deck for new cards:\n${deckNames.join('\n')}`, 
            state.defaultDeck
        );
        
        if (newDefaultDeck && deckNames.includes(newDefaultDeck)) {
            state.defaultDeck = newDefaultDeck;
            defaultDeckDisplay.textContent = newDefaultDeck;
        }
    }
    
    // Set up the resizable splitter
    let isResizing = false;
    let startY, startHeight;
    
    splitterHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        const editorPanel = document.querySelector('.editor-panel');
        startHeight = editorPanel.offsetHeight;
        
        document.documentElement.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const editorPanel = document.querySelector('.editor-panel');
        const container = document.querySelector('.splitter-container');
        const deltaY = e.clientY - startY;
        const newHeight = startHeight + deltaY;
        
        // Don't allow editor to be smaller than 100px or larger than 80% of container
        const minHeight = 100;
        const maxHeight = container.offsetHeight * 0.8;
        
        if (newHeight > minHeight && newHeight < maxHeight) {
            editorPanel.style.height = `${newHeight}px`;
        }
    }
    
    function stopResize() {
        if (isResizing) {
            isResizing = false;
            document.documentElement.style.cursor = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        }
    }
    
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
    function handlePaste(e) {
        // Prevent the default paste behavior
        e.preventDefault();
        
        // Get plain text from clipboard
        if (e.clipboardData && e.clipboardData.getData) {
            // Get the plain text
            const text = e.clipboardData.getData('text/plain');
            
            // Insert it at the cursor position using the standard command
            document.execCommand('insertText', false, text);
            
            // Clear any selection state
            clearAllHighlights();
            
            // Update the UI after a short delay
            setTimeout(handleTextSelection, 50);
        }
    }
    
    // Function to clear all highlights - super simplified approach
    function clearAllHighlights() {
        // Just remove the selection class - no DOM manipulation needed
        textInput.classList.remove('has-selection');
        
        // Clear any selection in the window
        window.getSelection().removeAllRanges();
    }
    
    function handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        const selectionStatus = document.getElementById('selectionStatus');
        
        // Store selected text in state
        state.selectedText = selectedText;
        
        // Enable/disable buttons based on selection
        const hasSelection = selectedText.length > 0;
        generateButton.disabled = !hasSelection;
        generateQuestionsButton.disabled = !hasSelection;
        
        // Update selection status text
        if (hasSelection) {
            // Update word and character count
            const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
            const charCount = selectedText.length;
            selectionStatus.textContent = `${wordCount} words, ${charCount} chars selected`;
            
            // Show a visual indication of selection
            textInput.classList.add('has-selection');
        } else {
            selectionStatus.textContent = 'No text selected';
            textInput.classList.remove('has-selection');
        }
    }
    
    async function generateCardsFromSelection() {
        const selectedText = state.selectedText;
        
        if (!selectedText) {
            alert('Please select some text first.');
            return;
        }
        
        try {
            // Update UI to show processing state
            generateButton.disabled = true;
            generateButton.textContent = 'Generating...';
            
            // Clear any existing highlights first
            clearAllHighlights();
            
            // Then highlight the selected text
            highlightSelection();
            
            // Get cards from Claude API using the default deck from state
            const cards = await generateCardsWithClaude(selectedText, state.defaultDeck);
            
            // Add generated cards to state
            state.cards = [...state.cards, ...cards];
            
            // Render all cards
            renderCards();
            
            // Update buttons state
            updateButtonStates();
            
            // Switch to cards tab
            switchToTab('cards-tab');
            
        } catch (error) {
            console.error('Error generating cards:', error);
            alert('Error generating cards: ' + (error.message || 'Please try again.'));
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Cards';
            
            // No automatic clearing - highlight will remain visible
            // until the user makes another selection or action
        }
    }
    
    async function generateQuestionsFromSelection() {
        const selectedText = state.selectedText;
        
        if (!selectedText) {
            alert('Please select some text first.');
            return;
        }
        
        try {
            // Update UI to show processing state
            generateQuestionsButton.disabled = true;
            generateQuestionsButton.textContent = 'Generating...';
            
            // Clear any existing highlights first
            clearAllHighlights();
            
            // Then highlight the selected text
            highlightSelection();
            
            // Get questions from Claude API
            const questions = await generateQuestionsWithClaude(selectedText);
            
            // Add generated questions to state
            state.questions = [...state.questions, ...questions];
            
            // Render all questions
            renderQuestions();
            
            // Update buttons state
            updateButtonStates();
            
            // Switch to questions tab
            switchToTab('questions-tab');
            
        } catch (error) {
            console.error('Error generating questions:', error);
            alert('Error generating questions: ' + (error.message || 'Please try again.'));
        } finally {
            generateQuestionsButton.disabled = false;
            generateQuestionsButton.textContent = 'Generate Questions';
            
            // No automatic clearing - highlight will remain visible
            // until the user makes another selection or action
        }
    }
    
    // Chat functions removed
    
    
    // Simple approach: We won't try to modify the DOM for highlighting.
    // Instead, we'll create a new element that overlays the text.
    
    // Variable to track the highlight overlay element
    let highlightOverlay = null;
    
    function highlightSelection() {
        // Clear any existing highlight first
        if (highlightOverlay) {
            highlightOverlay.remove();
            highlightOverlay = null;
        }
        
        try {
            // Get the selected text from state
            const selectedText = state.selectedText;
            if (!selectedText || selectedText.length === 0) return;
            
            // Instead of modifying the DOM, we'll just add a class to the text input
            // to show the user their selection was registered
            textInput.classList.add('has-selection');
            
            // That's it! We'll let the native browser selection handle the highlighting
            // This is much more reliable than trying to manipulate the DOM
            
        } catch (e) {
            console.error('Error in highlighting:', e);
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
    
    function renderQuestions() {
        questionsContainer.innerHTML = '';
        
        state.questions.forEach((question, index) => {
            const questionElement = createQuestionElement(question, index);
            questionsContainer.appendChild(questionElement);
        });
        
        // Update question count
        questionCountElement.textContent = `(${state.questions.length})`;
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
                <div class="card-header-left">
                    <span class="card-deck">${deck}</span>
                </div>
                <div class="card-header-right">
                    <button class="edit-deck-button">Change Deck</button>
                    <button class="delete-button" data-index="${index}">Delete</button>
                </div>
            </div>
            <div class="card-content">
                <div class="card-front">
                    <div class="card-label">Question:</div>
                    <div class="card-text" contenteditable="true">${front}</div>
                </div>
                <div class="card-back">
                    <div class="card-label">Answer:</div>
                    <div class="card-text" contenteditable="true">${back}</div>
                </div>
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
    
    function createQuestionElement(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        // Sanitize the question data to ensure it's rendered properly
        const sanitizeHtml = (text) => {
            const tempDiv = document.createElement('div');
            tempDiv.textContent = text;
            return tempDiv.innerHTML;
        };
        
        // Ensure content is properly formatted
        const questionText = typeof question.question === 'string' ? 
            sanitizeHtml(question.question) : sanitizeHtml(JSON.stringify(question.question));
            
        const topic = question.topic && typeof question.topic === 'string' ? 
            sanitizeHtml(question.topic) : 'General';
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <div class="question-header-left">
                    <span class="question-topic">${topic}</span>
                </div>
                <div class="question-header-right">
                    <button class="delete-question-button" data-index="${index}">Delete</button>
                </div>
            </div>
            <div class="question-body">
                <div class="question-text" contenteditable="true">${questionText}</div>
            </div>
        `;
        
        // Add event listeners
        const deleteButton = questionDiv.querySelector('.delete-question-button');
        deleteButton.addEventListener('click', () => deleteQuestion(index));
        
        // Make question content editable
        const questionTextElem = questionDiv.querySelector('.question-text');
        questionTextElem.addEventListener('blur', () => {
            state.questions[index].question = questionTextElem.textContent;
        });
        
        return questionDiv;
    }
    
    function deleteCard(index) {
        state.cards.splice(index, 1);
        renderCards();
        updateButtonStates();
    }
    
    function deleteQuestion(index) {
        state.questions.splice(index, 1);
        renderQuestions();
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
        // Cards buttons
        const hasCards = state.cards.length > 0;
        exportButton.disabled = !hasCards;
        clearCardsButton.disabled = !hasCards;
        
        // Questions buttons
        const hasQuestions = state.questions.length > 0;
        exportQuestionsButton.disabled = !hasQuestions;
        clearQuestionsButton.disabled = !hasQuestions;
    }
    
    function clearAllCards() {
        if (confirm('Are you sure you want to clear all cards?')) {
            state.cards = [];
            renderCards();
            updateButtonStates();
        }
    }
    
    function clearAllQuestions() {
        if (confirm('Are you sure you want to clear all questions?')) {
            state.questions = [];
            renderQuestions();
            updateButtonStates();
        }
    }
    
    async function exportToMochi() {
        try {
            const mochiData = formatCardsForMochi();
            const cards = JSON.parse(mochiData).cards;
            
            // First check if Mochi API integration is available
            const envResponse = await fetch('/api/env-status');
            const envStatus = await envResponse.json();
            
            if (!envStatus.hasMochiApiKey) {
                alert('Mochi API key not configured. Falling back to download.');
                downloadExport(mochiData, `spaced-rep-cards-${new Date().toISOString().slice(0, 10)}.json`);
                return;
            }
            
            // Show loading indicator
            exportButton.disabled = true;
            exportButton.textContent = 'Uploading...';
            
            // Use the server endpoint to handle Mochi uploads
            const response = await fetch('/api/upload-to-mochi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cards })
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload to Mochi');
            }
            
            const result = await response.json();
            alert(`${result.totalSuccess} of ${result.totalCards} cards uploaded to Mochi successfully!`);
            
        } catch (error) {
            console.error('Error uploading to Mochi API:', error);
            alert('Error uploading to Mochi. Falling back to download.');
            const mochiData = formatCardsForMochi();
            downloadExport(mochiData, `spaced-rep-cards-${new Date().toISOString().slice(0, 10)}.json`);
        } finally {
            // Reset button state
            exportButton.disabled = false;
            exportButton.textContent = 'Export to Mochi';
        }
    }
    
    function exportQuestions() {
        // Format questions as bullet point markdown
        let questionsMarkdown = '';
        
        state.questions.forEach(q => {
            questionsMarkdown += `- ${q.question}\n\n`;
        });
        
        // Download as markdown
        const blob = new Blob([questionsMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-questions-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    
    function formatCardsForMochi() {
        // Group cards by deck
        const deckMap = {};
        
        state.cards.forEach(card => {
            const deckId = state.decks[card.deck];
            if (!deckId) {
                console.warn(`No deck ID found for deck: ${card.deck}`);
                return; // Skip this card
            }
            
            if (!deckMap[deckId]) {
                deckMap[deckId] = [];
            }
            
            // Use the exact Mochi format: front \n---\n back (single newlines)
            deckMap[deckId].push({
                content: `${card.front}\n---\n${card.back}`
            });
        });
        
        // Format according to Mochi's JSON format
        const data = {
            version: 2,
            cards: []
        };
        
        // Add cards with their deck IDs (clean format)
        for (const [deckId, cards] of Object.entries(deckMap)) {
            const cleanDeckId = deckId.replace(/\[\[|\]\]/g, ''); // Remove [[ ]] if present
            
            cards.forEach(card => {
                data.cards.push({
                    ...card,
                    'deck-id': cleanDeckId
                });
            });
        }
        
        console.log('Formatted cards for Mochi:', data);
        return JSON.stringify(data, null, 2);
    }
    
    function downloadExport(data, filename) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
});
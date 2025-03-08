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
        
        // Toggle corresponding control group
        if (tabId === 'cards-tab') {
            document.getElementById('cards-controls').classList.add('active');
        } else if (tabId === 'questions-tab') {
            document.getElementById('questions-controls').classList.add('active');
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
            const text = e.clipboardData.getData('text/plain');
            
            // Insert text at cursor position
            document.execCommand('insertText', false, text);
            
            // Reset any text selection that might exist
            window.getSelection().removeAllRanges();
            
            // Check for selection after paste
            setTimeout(handleTextSelection, 0);
        }
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
            const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
            const charCount = selectedText.length;
            selectionStatus.textContent = `Selected: ${wordCount} words, ${charCount} characters`;
        } else {
            selectionStatus.textContent = 'No text selected';
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
            
            // Get cards from Claude API using the default deck from state
            const cards = await generateCardsWithClaude(selectedText, state.defaultDeck);
            
            // Add generated cards to state
            state.cards = [...state.cards, ...cards];
            
            // Render all cards
            renderCards();
            
            // Update buttons state
            updateButtonStates();
            
            // Highlight the selection
            highlightSelection();
            
            // Switch to cards tab
            switchToTab('cards-tab');
            
        } catch (error) {
            console.error('Error generating cards:', error);
            alert('Error generating cards: ' + (error.message || 'Please try again.'));
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Cards';
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
            
            // Get questions from Claude API
            const questions = await generateQuestionsWithClaude(selectedText);
            
            // Add generated questions to state
            state.questions = [...state.questions, ...questions];
            
            // Render all questions
            renderQuestions();
            
            // Update buttons state
            updateButtonStates();
            
            // Highlight the selection
            highlightSelection();
            
            // Switch to questions tab
            switchToTab('questions-tab');
            
        } catch (error) {
            console.error('Error generating questions:', error);
            alert('Error generating questions: ' + (error.message || 'Please try again.'));
        } finally {
            generateQuestionsButton.disabled = false;
            generateQuestionsButton.textContent = 'Generate Questions';
        }
    }
    
    // Chat functions removed
    
    
    function highlightSelection() {
        // Get the current selection
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        try {
            // Get the range of the current selection
            const range = selection.getRangeAt(0);
            
            // Check if the range is within our text input
            if (!textInput.contains(range.commonAncestorContainer)) {
                return;
            }
            
            // First clear any existing highlights
            const existingHighlights = textInput.querySelectorAll('.highlight');
            existingHighlights.forEach(highlight => {
                // Get the parent node
                const parent = highlight.parentNode;
                // Replace the highlight with its contents
                while (highlight.firstChild) {
                    parent.insertBefore(highlight.firstChild, highlight);
                }
                // Remove the empty highlight element
                parent.removeChild(highlight);
            });
            
            // Create a temporary marker for the selection
            const marker = document.createElement('mark');
            marker.className = 'highlight';
            marker.style.backgroundColor = 'var(--highlight-color)';
            marker.style.padding = '0';
            marker.style.margin = '0';
            marker.style.borderRadius = '2px';
            
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
        
        const notes = question.notes && typeof question.notes === 'string' ? 
            sanitizeHtml(question.notes) : '';
            
        const topic = question.topic && typeof question.topic === 'string' ? 
            sanitizeHtml(question.topic) : 'General';
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-topic">${topic}</span>
                <span>Question #${index + 1}</span>
            </div>
            <div class="question-text" contenteditable="true">${questionText}</div>
            ${notes ? `<div class="question-notes" contenteditable="true">${notes}</div>` : ''}
            <div class="question-actions">
                <button class="delete-question-button" data-index="${index}">Delete</button>
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
        
        const notesElem = questionDiv.querySelector('.question-notes');
        if (notesElem) {
            notesElem.addEventListener('blur', () => {
                state.questions[index].notes = notesElem.textContent;
            });
        }
        
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
    
    function exportToMochi() {
        const mochiData = formatCardsForMochi();
        downloadExport(mochiData, `spaced-rep-cards-${new Date().toISOString().slice(0, 10)}.json`);
    }
    
    function exportQuestions() {
        const questionsData = JSON.stringify(state.questions, null, 2);
        downloadExport(questionsData, `interview-questions-${new Date().toISOString().slice(0, 10)}.json`);
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
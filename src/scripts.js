// Import Claude API functions
import { 
    generateCardsWithClaude, 
    analyzeTextWithClaude,
    getStoredApiKeys,
    storeApiKeys,
    validateAnthropicApiKey
} from './claude-api.js';

// Quill.js is loaded globally from CDN

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - defined first
    const textInput = document.getElementById('textInput');
    const generateButton = document.getElementById('generateButton');
    const cardsContainer = document.getElementById('cardsContainer');
    const exportButton = document.getElementById('exportButton');
    const clearCardsButton = document.getElementById('clearCardsButton');
    const splitterHandle = document.getElementById('splitterHandle');
    const editorPanel = document.getElementById('editorPanel');
    const outputPanel = document.getElementById('outputPanel');
    
    // API Key Management
    const apiKeyModal = document.getElementById('apiKeyModal');
    const settingsButton = document.getElementById('settingsButton');
    const anthropicApiKeyInput = document.getElementById('anthropicApiKey');
    // Mochi API key input removed for Anki integration
    const storeLocallyCheckbox = document.getElementById('storeLocallyCheckbox');
    const apiKeySaveButton = document.getElementById('apiKeySave');
    const apiKeyCancelButton = document.getElementById('apiKeyCancel');
    const anthropicApiKeyError = document.getElementById('anthropicApiKeyError');
    
    // Dropdown Menu
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    // App State - defined early so it can be used by functions
    const state = {
        cards: [],
        selectedText: '',
        currentDeck: null,
        decks: {},
        documentContext: '',
        isAnalyzing: false,
        fromPaste: false,
        editor: null,
        // File management properties
        currentFile: null,
        availableFiles: [],
        isFileLoaded: false
    };
    
    // Toggle dropdown menu when menu button is clicked
    menuButton.addEventListener('click', () => {
        const expanded = menuButton.getAttribute('aria-expanded') === 'true';
        
        if (expanded) {
            // Close dropdown
            dropdownMenu.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        } else {
            // Open dropdown
            dropdownMenu.classList.add('show');
            menuButton.setAttribute('aria-expanded', 'true');
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Check for stored API keys on startup
    const storedKeys = getStoredApiKeys();
    if (storedKeys.anthropicApiKey) {
        // Pre-fill the form with stored keys (masked)
        anthropicApiKeyInput.value = storedKeys.anthropicApiKey;
        // Initialize Anki decks and then show file selection
        initializeAnkiDecks();
        showFileSelectionModal();
    } else {
        // Check if server has API key configured before showing modal
        checkServerConfiguration();
    }
    
    // Settings button opens the API key modal
    settingsButton.addEventListener('click', showApiKeyModal);
    
    // Save button in API key modal
    apiKeySaveButton.addEventListener('click', async () => {
        const anthropicKey = anthropicApiKeyInput.value.trim();
        const storeLocally = storeLocallyCheckbox.checked;
        
        // Validate the Anthropic API key
        if (!validateAnthropicApiKey(anthropicKey)) {
            anthropicApiKeyError.textContent = 'Required: Enter a valid Claude API key (starts with sk-ant-)';
            anthropicApiKeyInput.focus();
            return;
        }
        
        // Store the API keys
        const saveSuccess = storeApiKeys(anthropicKey, '', storeLocally);
        
        if (saveSuccess) {
            // Close the modal
            apiKeyModal.style.display = 'none';
            
            // Update UI based on available keys
            updateUiForApiKeys();
            
            // Initialize Anki decks (no API needed)
            initializeAnkiDecks();
            
            // Show success notification
            showNotification('API keys saved successfully', 'success');
            
            // Show file selection modal
            showFileSelectionModal();
        } else {
            // Show error notification
            showNotification('Failed to save API keys', 'error');
        }
    });
    
    // Cancel button in API key modal
    apiKeyCancelButton.addEventListener('click', () => {
        // If we have an Anthropic API key stored, just close the modal
        const storedKeys = getStoredApiKeys();
        if (storedKeys.anthropicApiKey) {
            apiKeyModal.style.display = 'none';
        } else {
            // Otherwise, show a warning specifically about the required Claude API key
            if (confirm('Without a Claude API key, you won\'t be able to generate flashcards. Do you want to continue without setting up the API key?')) {
                apiKeyModal.style.display = 'none';
            }
        }
    });
    
    function showApiKeyModal() {
        // Reset error message
        anthropicApiKeyError.textContent = '';
        
        // Fill in the form with stored values if available
        const storedKeys = getStoredApiKeys();
        if (storedKeys.anthropicApiKey) {
            anthropicApiKeyInput.value = storedKeys.anthropicApiKey;
        }
        
        // Show the modal
        apiKeyModal.style.display = 'flex';
    }
    
    function updateUiForApiKeys() {
        // Update export button text based on file status
        updateExportButtonText();
    }
    
    function updateExportButtonText() {
        const exportButton = document.getElementById('exportButton');
        if (state.isFileLoaded && state.currentFile) {
            exportButton.textContent = 'Add to Anki Deck';
        } else {
            exportButton.textContent = 'Export to Anki';
        }
    }
    
    // Call this on startup to set up the UI correctly
    updateUiForApiKeys();
    
    // Initialize Quill Editor
    function initQuillEditor() {
        try {
            // Configure Quill with the modules and formats we want
            const toolbarOptions = [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }]
            ];
            
            // Create a new Quill editor instance
            state.editor = new Quill('#textInput', {
                modules: {
                    toolbar: toolbarOptions
                },
                placeholder: 'Paste or type your text here, then highlight sections to generate cards...',
                theme: 'snow'
            });
            
            // Handle text change events
            state.editor.on('text-change', function() {
                // Clear any existing timeout
                if (textChangeTimeout) {
                    clearTimeout(textChangeTimeout);
                }
                
                // Set a new timeout to analyze text after typing stops
                textChangeTimeout = setTimeout(() => {
                    // Get text content from the editor
                    const fullText = state.editor.getText();
                    if (fullText.trim().length > 100 && !state.isAnalyzing) {
                        analyzeDocumentContext(fullText);
                    }
                }, 1500);
            });
            
            // Handle selection change events
            state.editor.on('selection-change', function(range) {
                if (range) {
                    if (range.length > 0) {
                        // We have a selection
                        const selectedText = state.editor.getText(range.index, range.length);
                        
                        // Store selected text in state
                        state.selectedText = selectedText.trim();
                        
                        // Enable generate button
                        generateButton.disabled = false;
                        
                        // Show visual indication
                        textInput.classList.add('has-selection');
                    } else {
                        // Cursor changed position but no selection
                        state.selectedText = '';
                        generateButton.disabled = true;
                        textInput.classList.remove('has-selection');
                    }
                } else {
                    // Editor lost focus
                    state.selectedText = '';
                    textInput.classList.remove('has-selection');
                }
            });
            
            console.log('Quill editor initialized');
        } catch (error) {
            console.error('Error initializing Quill editor:', error);
        }
    }
    
    // Handle selection for fallback editor
    function handleEditorSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Store selected text in state
        state.selectedText = selectedText;
        
        // Enable/disable buttons based on selection
        const hasSelection = selectedText.length > 0;
        generateButton.disabled = !hasSelection;
        
        // Show a visual indication of selection
        if (hasSelection) {
            textInput.classList.add('has-selection');
        } else {
            textInput.classList.remove('has-selection');
        }
    }
    
    // Fetch decks from Mochi API
    function initializeAnkiDecks() {
        // Set up default Anki deck names - these will be used as-is in the TSV export
        state.decks = {
            "General": "General",
            "Vocabulary": "Vocabulary", 
            "Concepts": "Concepts",
            "Facts": "Facts",
            "Study Notes": "Study Notes",
            "Language Learning": "Language Learning",
            "Science": "Science",
            "History": "History",
            "Math": "Math"
        };
        
        // Set default deck
        state.currentDeck = "General";
        
        // Update export button text
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.textContent = 'Export to Anki';
        }
        
        // Create deck selector dropdown
        createDeckSelector();
        
        console.log('Initialized Anki deck options:', Object.keys(state.decks));
    }
    
    // Function to show status notifications
    function showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.status-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `status-notification ${type}`;
        
        // Add icon
        const icon = document.createElement('span');
        icon.className = 'icon';
        notification.appendChild(icon);
        
        // Add message
        const messageEl = document.createElement('span');
        messageEl.textContent = message;
        notification.appendChild(messageEl);
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
        
        return notification;
    }
    
    // Event Listeners
    generateButton.addEventListener('click', generateCardsFromSelection);
    exportButton.addEventListener('click', exportToAnki);
    clearCardsButton.addEventListener('click', clearAllCards);
    
    // Initialize Quill editor
    let textChangeTimeout = null;
    try {
        // Initialize the Quill editor
        initQuillEditor();
        
        // Quill handles paste events automatically
        // We'll analyze text after paste in the text-change handler
    } catch (error) {
        console.error('Failed to initialize Quill editor, falling back to basic contenteditable', error);
        // Fallback to basic contenteditable if Quill fails
        textInput.setAttribute('contenteditable', 'true');
        textInput.setAttribute('placeholder', 'Paste or type your text here, then highlight sections to generate cards...');
        
        // Add basic event listeners
        textInput.addEventListener('mouseup', handleEditorSelection);
        textInput.addEventListener('keyup', handleEditorSelection);
        textInput.addEventListener('input', () => {
            // Clear any existing timeout
            if (textChangeTimeout) {
                clearTimeout(textChangeTimeout);
            }
            
            // Set a new timeout to analyze text after typing stops
            textChangeTimeout = setTimeout(() => {
                const fullText = textInput.textContent || '';
                if (fullText.trim().length > 100 && !state.isAnalyzing) {
                    analyzeDocumentContext(fullText);
                }
            }, 1500);
        });
        
        // Add plain text paste handler for fallback
        textInput.addEventListener('paste', async function(e) {
            // Prevent the default paste behavior
            e.preventDefault();
            
            // Get plain text from clipboard
            const text = e.clipboardData.getData('text/plain');
            
            // Insert it at the cursor position using the standard command
            document.execCommand('insertText', false, text);
            
            // If text is long enough, analyze it immediately
            if (text.length > 100) {
                state.fromPaste = true;
                await analyzeDocumentContext(text);
            }
        });
    }
    
    // Enable the button if there's already text in the selection (Quill handles this now)
    // handleTextSelection() is now replaced by Quill's selection-change event
    
    // Initialize UI and fetch decks
    updateButtonStates();
    
    // Fetch decks from Mochi API on startup
    fetchDecks().catch(error => {
        console.error('Error initializing decks:', error);
        // Create a fallback deck selector in case of error
        createDeckSelector();
    });
    
    // We no longer need a deck selector in the main UI - we'll only show it when editing a card
    function createDeckSelector() {
        // Simply set the default current deck if none is set yet
        if (!state.currentDeck && Object.keys(state.decks).length > 0) {
            state.currentDeck = Object.keys(state.decks)[0];
        }
        // No UI elements to create here anymore
    }
    
    // Set up the resizable splitter
    let isResizing = false;
    let startY, startHeight;
    
    splitterHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = editorPanel.offsetHeight;
        
        document.documentElement.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const container = document.querySelector('.dynamic-container');
        const containerHeight = container.offsetHeight;
        const deltaY = e.clientY - startY;
        const newEditorHeight = startHeight + deltaY;
        
        // Calculate editor height as percentage of container
        const editorHeightPercentage = (newEditorHeight / containerHeight) * 100;
        
        // Don't allow editor to be smaller than 20% or larger than 80% of container
        const minHeightPercentage = 20;
        const maxHeightPercentage = 80;
        
        if (editorHeightPercentage > minHeightPercentage && editorHeightPercentage < maxHeightPercentage) {
            // Use percentage for responsive sizing
            editorPanel.style.height = `${editorHeightPercentage}%`;
            
            // Calculate output panel height as the remaining percentage
            const outputHeightPercentage = 100 - editorHeightPercentage;
            outputPanel.style.height = `${outputHeightPercentage}%`;
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
    // Analyze text to extract context summary when text is pasted
    async function analyzeDocumentContext(text) {
        if (!text || text.trim().length < 100 || state.isAnalyzing) {
            return; // Skip short texts or if already analyzing
        }
        
        try {
            // Set analyzing state flag
            state.isAnalyzing = true;
            
            // Only disable the button if there's no selection
            if (!state.selectedText || state.selectedText.length === 0) {
                generateButton.disabled = true;
            }
            
            // Call Claude API to get document context
            const contextSummary = await analyzeTextWithClaude(text);
            
            if (contextSummary) {
                // Store in state for later use
                state.documentContext = contextSummary;
                
                // Show a subtle visual indicator that context is available
                document.body.classList.add('has-document-context');
                
                // Show a non-disruptive notification that analysis is complete
                showNotification('Text analysis complete. Card quality will be improved.', 'success', 4000);
            }
            
            state.fromPaste = false;
        } catch (error) {
            console.error('Error analyzing document:', error);
        } finally {
            // Reset analyzing state
            state.isAnalyzing = false;
            
            // Re-enable button if there's a selection
            const hasSelection = state.selectedText && state.selectedText.length > 0;
            generateButton.disabled = !hasSelection;
        }
    }
    
    // Function to clear all highlights - adapted for Quill
    function clearAllHighlights() {
        // Remove the selection class
        textInput.classList.remove('has-selection');
        
        // Clear any selection in Quill or fall back to window selection
        if (state.editor && state.editor.setSelection) {
            // Clear Quill selection
            state.editor.setSelection(null);
        } else {
            // Fallback to window selection
            window.getSelection().removeAllRanges();
        }
    }
    
    async function generateCardsFromSelection() {
        const selectedText = state.selectedText;
        
        if (!selectedText) {
            showNotification('Please select some text first.', 'error');
            return;
        }
        
        try {
            // Update UI to show processing state
            generateButton.disabled = true;
            generateButton.textContent = 'Generating...';
            
            // Get cards from Claude API
            const cards = await generateCardsWithClaude(
                selectedText,
                Object.keys(state.decks).join(', '),
                state.documentContext
            );
            
            // Add generated cards to state
            state.cards = [...state.cards, ...cards];
            
            // Update UI
            renderCards();
            updateButtonStates();
            
            showNotification(`${cards.length} cards created successfully`, 'success');
        } catch (error) {
            console.error('Error generating cards:', error);
            
            // Provide a more specific message for timeout errors
            if (error.message && error.message.includes('FUNCTION_INVOCATION_TIMEOUT')) {
                showNotification('The request timed out. Please select a smaller portion of text and try again.', 'error');
            } else if (error.message && error.message.includes('timed out')) {
                showNotification('The request timed out. Please select a smaller portion of text and try again.', 'error');
            } else {
                showNotification('Error generating cards: ' + (error.message || 'Please try again.'), 'error');
            }
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = 'Create Cards';
        }
    }
    
    function renderCards() {
        cardsContainer.innerHTML = '';
        
        // Show or hide the cards section based on whether there are cards
        if (state.cards.length > 0) {
            // Show the output panel and splitter if they're hidden
            if (outputPanel.style.display === 'none') {
                // Show the splitter handle with animation
                splitterHandle.style.display = 'flex';
                splitterHandle.classList.add('animate-in');
                
                // Show the output panel
                outputPanel.style.display = 'flex';
                
                // Set the editor panel to 50% height
                editorPanel.style.height = '50%';
            }
            
            // Render each card
            state.cards.forEach((card, index) => {
                const cardElement = createCardElement(card, index);
                cardsContainer.appendChild(cardElement);
            });
        } else {
            // Hide the output panel and splitter if there are no cards
            splitterHandle.style.display = 'none';
            outputPanel.style.display = 'none';
            
            // Reset the editor panel to full height
            editorPanel.style.height = '100%';
        }
    }
    
    // renderQuestions function removed
    
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
                    <span class="card-deck" title="Click to change deck">${deck}</span>
                </div>
                <div class="card-header-right">
                    <button class="delete-button" data-index="${index}" title="Delete Card">×</button>
                </div>
            </div>
            <div class="card-content">
                <div class="card-front">
                    <div class="card-text" contenteditable="true">${front}</div>
                </div>
                <div class="card-back">
                    <div class="card-text" contenteditable="true">${back}</div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const deleteButton = cardDiv.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => deleteCard(index));
        
        const deckLabel = cardDiv.querySelector('.card-deck');
        deckLabel.addEventListener('click', () => editCardDeck(index));
        
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
    
    // createQuestionElement function removed
    
    function deleteCard(index) {
        state.cards.splice(index, 1);
        renderCards();
        updateButtonStates();
    }
    
    // deleteQuestion function removed
    
    function editCardDeck(index) {
        const card = state.cards[index];
        const deckNames = Object.keys(state.decks);
        
        if (deckNames.length === 0) {
            showNotification('No decks available. Please check Mochi connection.', 'error');
            return;
        }
        
        // Create an improved modal dialog with a dropdown
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalHeader = document.createElement('h3');
        modalHeader.textContent = 'Select Deck';
        
        const modalSubHeader = document.createElement('p');
        modalSubHeader.className = 'modal-subheader';
        modalSubHeader.textContent = 'Choose a deck for this card:';
        
        // Create a styled select element
        const selectContainer = document.createElement('div');
        selectContainer.className = 'modal-select-container';
        
        const deckSelect = document.createElement('select');
        deckSelect.className = 'deck-select';
        
        // No refresh button needed for static Anki decks
        
        // Get deck names and sort them alphabetically
        const sortedDeckNames = deckNames.sort((a, b) => 
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        
        // Add options based on available decks
        sortedDeckNames.forEach(deckName => {
            const option = document.createElement('option');
            option.value = deckName;
            option.textContent = deckName;
            if (deckName === card.deck) {
                option.selected = true;
            }
            deckSelect.appendChild(option);
        });
        
        selectContainer.appendChild(deckSelect);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'modal-cancel';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Update Deck';
        saveButton.className = 'modal-save';
        saveButton.addEventListener('click', () => {
            const oldDeck = card.deck;
            card.deck = deckSelect.value;
            renderCards();
            document.body.removeChild(modalOverlay);
            
            if (oldDeck !== card.deck) {
                showNotification(`Card moved to "${card.deck}" deck`, 'success');
            }
        });
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);
        
        // Assemble the modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalSubHeader);
        modalContent.appendChild(selectContainer);
        modalContent.appendChild(buttonContainer);
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    }
    
    function updateButtonStates() {
        // Update card-related buttons based on whether cards exist
        const hasCards = state.cards.length > 0;
        exportButton.disabled = !hasCards;
        clearCardsButton.disabled = !hasCards;
        
        // Update create cards button based on text selection
        const hasSelection = state.selectedText && state.selectedText.length > 0;
        generateButton.disabled = !hasSelection;
    }
    
    function clearAllCards() {
        if (state.isFileLoaded) {
            const choice = confirm('Do you want to:\n\nOK - Clear cards and start a new file\nCancel - Just clear the current view (keep file loaded)');
            
            if (choice) {
                // Start fresh session
                startFreshSession();
                showNotification('Started new session', 'info');
            } else {
                // Just clear the view but keep file loaded
                state.cards = [];
                renderCards();
                updateButtonStates();
                showNotification('Cleared current view', 'info');
            }
        } else {
            // No file loaded, just clear
            state.cards = [];
            renderCards();
            updateButtonStates();
            showNotification('All cards cleared', 'info');
        }
    }
    
    // clearAllQuestions function removed
    
    
    async function exportToAnki() {
        try {
            // Check if we have any cards to export
            if (state.cards.length === 0) {
                showNotification('No cards to export', 'info');
                return;
            }
            
            // Show loading indicator
            exportButton.disabled = true;
            const originalText = exportButton.textContent;
            exportButton.textContent = 'Preparing Export...';
            
            // Prepare request body
            const requestBody = { 
                cards: state.cards,
                append: true
            };

            // If we have a current file, use it
            if (state.currentFile) {
                requestBody.filename = state.currentFile;
            }
            
            // Use the server endpoint to format cards for Anki
            const response = await fetch('/api/anki-export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error('Failed to format cards for Anki');
            }
            
            const result = await response.json();
            
            // Update current file if we created a new one
            if (!state.currentFile) {
                state.currentFile = result.filename;
                state.isFileLoaded = true;
                updateExportButtonText();
            }
            
            // Download the TSV file
            const blob = new Blob([result.content], { type: 'text/tab-separated-values' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            // Success notification
            const message = result.appended 
                ? `${result.cardCount} cards appended to ${result.filename}!`
                : `${result.cardCount} cards exported to new file ${result.filename}!`;
            showNotification(message, 'success');
            
        } catch (error) {
            console.error('Error exporting to Anki:', error);
            showNotification('Error exporting to Anki. Exporting as markdown instead.', 'error');
            
            // Fall back to markdown export
            exportAsMarkdown();
        } finally {
            // Reset button state
            exportButton.disabled = false;
            updateExportButtonText();
        }
    }
    
    function exportAsMarkdown() {
        if (state.cards.length === 0) {
            showNotification('No cards to export', 'info');
            return;
        }
        
        // Format cards as markdown
        let markdown = `# Flashcards - ${new Date().toLocaleDateString()}\n\n`;
        
        // Group cards by deck
        const deckGroups = {};
        
        state.cards.forEach(card => {
            const deckName = card.deck || 'General';
            if (!deckGroups[deckName]) {
                deckGroups[deckName] = [];
            }
            deckGroups[deckName].push(card);
        });
        
        // Add each deck's cards to the markdown
        for (const [deckName, cards] of Object.entries(deckGroups)) {
            markdown += `## ${deckName}\n\n`;
            
            cards.forEach((card, index) => {
                markdown += `### Card ${index + 1}\n\n`;
                markdown += `**Question:** ${card.front}\n\n`;
                markdown += `---\n\n`;
                markdown += `**Answer:** ${card.back}\n\n`;
            });
        }
        
        try {
            // Download the markdown file
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashcards-${new Date().toISOString().slice(0, 10)}.md`;
            a.style.display = 'none'; // Hide the element
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            showNotification(`${state.cards.length} cards exported as markdown`, 'success');
        } catch (error) {
            console.error('Error exporting markdown:', error);
            
            // Alternative method for environments where the download might be blocked
            const textarea = document.createElement('textarea');
            textarea.value = markdown;
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showNotification('Export copied to clipboard instead (download failed)', 'warning');
            } catch (clipboardError) {
                console.error('Clipboard copy failed:', clipboardError);
                showNotification('Export failed. Check console for markdown content', 'error');
                console.log('MARKDOWN CONTENT:');
                console.log(markdown);
            }
            
            document.body.removeChild(textarea);
        }
    }
    
    // exportQuestions function removed
    
    // formatCardsForMochi function removed - using Anki TSV format instead
    
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

    // ===== FILE MANAGEMENT FUNCTIONS =====

    async function showFileSelectionModal() {
        try {
            // Fetch available files
            const response = await fetch('/api/anki-export');
            const data = await response.json();
            
            if (!data.success) {
                console.error('Failed to fetch files:', data.error);
                showNotification('Error loading files. Starting fresh session.', 'warning');
                return;
            }

            state.availableFiles = data.files;

            // Create modal
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 8px;
                width: 500px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            const modalHeader = document.createElement('h2');
            modalHeader.textContent = 'Load Anki Deck or Start Fresh';
            modalHeader.style.marginBottom = '20px';

            const description = document.createElement('p');
            description.textContent = 'Choose an existing deck to continue adding cards, or start a new deck.';
            description.style.marginBottom = '20px';
            description.style.color = '#666';

            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.marginBottom = '20px';

            // Start Fresh button
            const startFreshButton = document.createElement('button');
            startFreshButton.textContent = 'Start Fresh Deck';
            startFreshButton.className = 'btn btn-primary';
            startFreshButton.style.cssText = `
                padding: 10px 20px;
                margin-right: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // New Deck button
            const newDeckButton = document.createElement('button');
            newDeckButton.textContent = 'Create Named Deck';
            newDeckButton.className = 'btn btn-secondary';
            newDeckButton.style.cssText = `
                padding: 10px 20px;
                margin-right: 10px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // Upload TSV button
            const uploadButton = document.createElement('button');
            uploadButton.textContent = 'Upload TSV File';
            uploadButton.className = 'btn btn-success';
            uploadButton.style.cssText = `
                padding: 10px 20px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // Create a row for the first two buttons
            const topRow = document.createElement('div');
            topRow.style.display = 'flex';
            topRow.style.gap = '16px'; // Match the horizontal gap
            topRow.appendChild(startFreshButton);
            topRow.appendChild(newDeckButton);

            // Create a row for the upload button
            const bottomRow = document.createElement('div');
            bottomRow.style.marginTop = '16px'; // Match the horizontal gap
            bottomRow.appendChild(uploadButton);

            buttonsContainer.appendChild(topRow);
            buttonsContainer.appendChild(bottomRow);

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(description);
            modalContent.appendChild(buttonsContainer);

            // Existing files section
            if (state.availableFiles.length > 0) {
                const existingHeader = document.createElement('h3');
                existingHeader.textContent = 'Or load an existing deck:';
                existingHeader.style.cssText = 'margin: 20px 0 10px 0; border-top: 1px solid #eee; padding-top: 20px;';

                const filesList = document.createElement('div');
                filesList.style.cssText = 'max-height: 200px; overflow-y: auto;';

                state.availableFiles.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.style.cssText = `
                        padding: 10px;
                        border: 1px solid #ddd;
                        margin-bottom: 5px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    `;

                    fileItem.innerHTML = `
                        <strong>${file.filename}</strong><br>
                        <small>Cards: ${file.cardCount} | Modified: ${new Date(file.modified).toLocaleDateString()}</small>
                    `;

                    fileItem.addEventListener('mouseover', () => {
                        fileItem.style.backgroundColor = '#f8f9fa';
                    });

                    fileItem.addEventListener('mouseout', () => {
                        fileItem.style.backgroundColor = 'white';
                    });

                    fileItem.addEventListener('click', () => {
                        loadExistingFile(file.filename);
                        document.body.removeChild(modalOverlay);
                    });

                    filesList.appendChild(fileItem);
                });

                modalContent.appendChild(existingHeader);
                modalContent.appendChild(filesList);
            }

            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);

            // Event listeners
            startFreshButton.addEventListener('click', () => {
                startFreshSession();
                document.body.removeChild(modalOverlay);
            });

            newDeckButton.addEventListener('click', () => {
                document.body.removeChild(modalOverlay);
                showNewDeckModal();
            });

            uploadButton.addEventListener('click', () => {
                document.body.removeChild(modalOverlay);
                showUploadModal();
            });

        } catch (error) {
            console.error('Error showing file selection modal:', error);
            showNotification('Error loading file selection. Starting fresh session.', 'warning');
            startFreshSession();
        }
    }

    function showNewDeckModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            width: 400px;
        `;

        modalContent.innerHTML = `
            <h2 style="margin-bottom: 20px;">Create New Deck</h2>
            <p style="margin-bottom: 15px; color: #666;">Enter a name for your new Anki deck:</p>
            <input type="text" id="newDeckName" placeholder="My Study Deck" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 20px;
                font-size: 16px;
            ">
            <div style="text-align: right;">
                <button id="cancelNewDeck" style="
                    padding: 8px 16px;
                    margin-right: 10px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="createNewDeck" style="
                    padding: 8px 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Create</button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const nameInput = document.getElementById('newDeckName');
        const createButton = document.getElementById('createNewDeck');
        const cancelButton = document.getElementById('cancelNewDeck');

        nameInput.focus();

        createButton.addEventListener('click', async () => {
            const deckName = nameInput.value.trim();
            if (!deckName) {
                showNotification('Please enter a deck name', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/anki-export/new', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: deckName })
                });

                const result = await response.json();
                if (result.success) {
                    loadExistingFile(result.filename);
                    showNotification(`Created new deck: ${result.filename}`, 'success');
                } else {
                    showNotification('Error creating deck: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Error creating new deck:', error);
                showNotification('Error creating new deck', 'error');
            }

            document.body.removeChild(modalOverlay);
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            showFileSelectionModal();
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createButton.click();
            }
        });
    }

    function showUploadModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            width: 400px;
        `;

        modalContent.innerHTML = `
            <h2 style="margin-bottom: 20px;">Upload TSV File</h2>
            <p style="margin-bottom: 15px; color: #666;">Select a TSV file exported from Anki to import existing cards:</p>
            <input type="file" id="tsvFileInput" accept=".tsv,.txt" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 20px;
                font-size: 16px;
            ">
            <div style="text-align: right;">
                <button id="cancelUpload" style="
                    padding: 8px 16px;
                    margin-right: 10px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="uploadTsv" style="
                    padding: 8px 16px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Upload</button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const fileInput = document.getElementById('tsvFileInput');
        const uploadButton = document.getElementById('uploadTsv');
        const cancelButton = document.getElementById('cancelUpload');

        uploadButton.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a TSV file', 'warning');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/anki-export/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    // Load the uploaded cards into the app state
                    state.cards = result.cards;
                    state.currentFile = result.filename;
                    state.isFileLoaded = true;
                    
                    // Update UI
                    updateExportButtonText();
                    renderCards();
                    updateButtonStates();
                    
                    showNotification(`Uploaded ${result.cardCount} cards from ${file.name}`, 'success');
                } else {
                    showNotification('Error uploading file: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Error uploading TSV file:', error);
                showNotification('Error uploading file', 'error');
            }

            document.body.removeChild(modalOverlay);
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            showFileSelectionModal();
        });
    }

    async function loadExistingFile(filename) {
        try {
            const response = await fetch(`/api/anki-export/${filename}`);
            const data = await response.json();

            if (!data.success) {
                showNotification('Error loading file: ' + data.error, 'error');
                return;
            }

            // Update state
            state.currentFile = filename;
            state.isFileLoaded = true;
            state.cards = data.cards || [];

            // Update UI
            updateExportButtonText();
            renderCards();
            updateButtonStates();

            showNotification(`Loaded ${data.cardCount} cards from ${filename}`, 'success');

        } catch (error) {
            console.error('Error loading file:', error);
            showNotification('Error loading file', 'error');
        }
    }

    function startFreshSession() {
        // Reset state
        state.currentFile = null;
        state.isFileLoaded = false;
        state.cards = [];

        // Update UI
        updateExportButtonText();
        renderCards();
        updateButtonStates();

        showNotification('Started fresh session', 'info');
    }

    // Add menu option to load a different file
    function addFileManagementToMenu() {
        const dropdown = document.getElementById('dropdown-menu');
        
        // Add file management options
        const loadFileOption = document.createElement('a');
        loadFileOption.href = '#';
        loadFileOption.className = 'dropdown-item';
        loadFileOption.innerHTML = '📁 Load Different Deck';
        loadFileOption.addEventListener('click', (e) => {
            e.preventDefault();
            showFileSelectionModal();
            dropdown.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        });

        const newFileOption = document.createElement('a');
        newFileOption.href = '#';
        newFileOption.className = 'dropdown-item';
        newFileOption.innerHTML = '🆕 Start New Deck';
        newFileOption.addEventListener('click', (e) => {
            e.preventDefault();
            startFreshSession();
            dropdown.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        });

        // Add to dropdown
        dropdown.appendChild(loadFileOption);
        dropdown.appendChild(newFileOption);
    }

    // Initialize file management menu
    addFileManagementToMenu();

    // Function to check server configuration
    async function checkServerConfiguration() {
        try {
            const response = await fetch('/api/server-config');
            const config = await response.json();
            
            if (config.hasServerApiKey) {
                // Server has API key configured, skip modal and go straight to file selection
                console.log('Server has API key configured, skipping client-side API key setup');
                initializeAnkiDecks();
                showFileSelectionModal();
            } else {
                // Server requires client API key, show modal
                showApiKeyModal();
            }
        } catch (error) {
            console.warn('Could not check server configuration, showing API key modal as fallback:', error);
            showApiKeyModal();
        }
    }
});

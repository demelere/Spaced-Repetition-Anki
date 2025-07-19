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
        currentDeck: 'General',
        decks: {},
        documentContext: '',
        isAnalyzing: false,
        fromPaste: false,
        editor: null,
        // File management properties
        currentFile: null,
        availableFiles: [],
        isFileLoaded: false,
        isFirstSave: true,
        fileHandle: null, // For File System Access API
        supportsFileSystemAPI: 'showSaveFilePicker' in window
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
    
    // Clipped texts button shows available clipped texts
    const clippedTextsButton = document.getElementById('clippedTextsButton');
    clippedTextsButton.addEventListener('click', showClippedTextsModal);
    
    // Close button for clipped texts modal
    const clippedTextsClose = document.getElementById('clippedTextsClose');
    clippedTextsClose.addEventListener('click', () => {
        document.getElementById('clippedTextsModal').style.display = 'none';
    });
    
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
    
    // Show clipped texts modal
    async function showClippedTextsModal() {
        try {
            const modal = document.getElementById('clippedTextsModal');
            const listContainer = document.getElementById('clippedTextsList');
            
            // Show loading state
            listContainer.innerHTML = '<div class="clipped-text-empty">Loading...</div>';
            modal.style.display = 'flex';
            
            // Fetch available clipped texts
            const response = await fetch('/api/clipped-texts');
            
            if (response.ok) {
                const result = await response.json();
                const clips = result.clips;
                
                if (clips.length === 0) {
                    listContainer.innerHTML = `
                        <div class="clipped-text-empty">
                            <div class="icon">📋</div>
                            <div>No clipped texts available</div>
                            <div style="font-size: 12px; margin-top: 8px;">
                                Use the Obsidian Web Clipper extension to send text here
                            </div>
                        </div>
                    `;
                } else {
                    // Render clipped texts
                    listContainer.innerHTML = clips.map(clip => `
                        <div class="clipped-text-item" data-clip-id="${clip.id}">
                            <div class="clipped-text-header">
                                <div>
                                    <div class="clipped-text-title">${clip.title || 'Untitled'}</div>
                                    <div class="clipped-text-meta">
                                        <span class="clipped-text-timestamp">${formatTimestamp(clip.timestamp)}</span>
                                        <span class="clipped-text-source">${clip.source}</span>
                                        ${clip.url ? `<a href="${clip.url}" target="_blank" style="color: var(--primary-color); text-decoration: none; margin-left: 8px;">🔗</a>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="clipped-text-preview">
                                ${clip.textLength > 200 ? clip.textLength + ' characters' : 'Short text'}
                            </div>
                        </div>
                    `).join('');
                    
                    // Add click handlers for each clipped text item
                    listContainer.querySelectorAll('.clipped-text-item').forEach(item => {
                        item.addEventListener('click', async () => {
                            const clipId = item.dataset.clipId;
                            await loadClippedText(clipId);
                            modal.style.display = 'none';
                        });
                    });
                }
            } else {
                listContainer.innerHTML = `
                    <div class="clipped-text-empty">
                        <div class="icon">⚠️</div>
                        <div>Failed to load clipped texts</div>
                        <div style="font-size: 12px; margin-top: 8px;">
                            Please try again later
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error showing clipped texts modal:', error);
            const listContainer = document.getElementById('clippedTextsList');
            listContainer.innerHTML = `
                <div class="clipped-text-empty">
                    <div class="icon">⚠️</div>
                    <div>Error loading clipped texts</div>
                    <div style="font-size: 12px; margin-top: 8px;">
                        ${error.message}
                    </div>
                </div>
            `;
        }
    }
    
    // Load a specific clipped text
    async function loadClippedText(clipId) {
        try {
            const response = await fetch(`/api/clipped-text/${clipId}`);
            
            if (response.ok) {
                const result = await response.json();
                const clippedData = result.data;
                
                // Use the same workflow logic as the URL-based loading
                await handleClippedTextLoad(clippedData, clipId);
                
            } else {
                showNotification('Failed to load clipped text. It may have expired.', 'error');
            }
        } catch (error) {
            console.error('Error loading clipped text:', error);
            showNotification('Error loading clipped text', 'error');
        }
    }
    
    // Helper function to format timestamp
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Set up continuous monitoring for incoming clipped texts using SSE
    function setupClippedTextMonitoring() {
        let lastUrl = window.location.href;
        let sseConnection = null;
        
        // Check for URL changes (for direct links from extension)
        const checkUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                console.log('URL changed, checking for clipped text...');
                lastUrl = currentUrl;
                checkForClippedText();
            }
        };
        
        // Set up SSE connection for real-time updates
        function setupSSEConnection() {
            try {
                sseConnection = new EventSource('/api/clipped-texts/stream');
                
                sseConnection.onopen = function(event) {
                    console.log('SSE connection established');
                };
                
                sseConnection.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('SSE message received:', data);
                        
                        switch(data.type) {
                            case 'connected':
                                console.log('SSE connection confirmed');
                                break;
                                
                            case 'new-clip':
                                console.log('New clip received via SSE:', data.data);
                                if (!document.hidden) {
                                    const sourceInfo = data.data.title || data.data.source || 'webpage';
                                    showNotification(`New text received from ${sourceInfo}. Click "Clipped Texts" in the menu to view.`, 'info', 8000);
                                }
                                break;
                                
                            default:
                                console.log('Unknown SSE message type:', data.type);
                        }
                    } catch (error) {
                        console.error('Error parsing SSE message:', error);
                    }
                };
                
                sseConnection.onerror = function(error) {
                    console.error('SSE connection error:', error);
                    // Reconnect after 5 seconds
                    setTimeout(() => {
                        if (sseConnection) {
                            sseConnection.close();
                        }
                        setupSSEConnection();
                    }, 5000);
                };
                
            } catch (error) {
                console.error('Failed to set up SSE connection:', error);
                // Fallback to polling if SSE fails
                setupPollingFallback();
            }
        }
        
        // Fallback polling method if SSE fails
        function setupPollingFallback() {
            console.log('Using polling fallback for clipped text monitoring');
            let lastClipCount = 0;
            
            const pollForNewClips = async () => {
                try {
                    const response = await fetch('/api/clipped-texts');
                    if (response.ok) {
                        const result = await response.json();
                        const currentClipCount = result.count;
                        
                        if (currentClipCount > lastClipCount && !document.hidden) {
                            const newClips = currentClipCount - lastClipCount;
                            showNotification(`${newClips} new clipped text${newClips > 1 ? 's' : ''} received. Click "Clipped Texts" in the menu to view.`, 'info', 8000);
                        }
                        
                        lastClipCount = currentClipCount;
                    }
                } catch (error) {
                    console.warn('Error polling for new clips:', error);
                }
            };
            
            setInterval(pollForNewClips, 3000);
        }
        
        // Set up URL change detection
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(checkUrlChange, 100);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(checkUrlChange, 100);
        };
        
        window.addEventListener('popstate', checkUrlChange);
        
        // Set up SSE connection
        setupSSEConnection();
        
        // Also check when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('Page became visible, checking for clipped text...');
                checkForClippedText();
            }
        });
        
        // Clean up SSE connection when page unloads
        window.addEventListener('beforeunload', () => {
            if (sseConnection) {
                sseConnection.close();
            }
        });
        
        console.log('SSE-based clipped text monitoring set up');
    }
    
    function updateUiForApiKeys() {
        // Update export button text based on file status
        updateExportButtonText();
    }
    
    function updateExportButtonText() {
        const exportButton = document.getElementById('exportButton');
        if (state.isFileLoaded && state.currentFile) {
            exportButton.textContent = `Save to ${state.currentFile}`;
        } else {
            exportButton.textContent = 'Save';
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
            exportButton.textContent = 'Save';
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
    
    // Check for clipped text from extension on startup
    console.log('App initialized, checking for clipped text...');
    checkForClippedText();
    
    // Set up continuous monitoring for incoming clipped texts
    setupClippedTextMonitoring();
    
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
    
    // Check for clipped text from the extension
    async function checkForClippedText() {
        try {
            // Check if there's a clipId in the URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const clipId = urlParams.get('clipId');
            
            console.log('Checking for clipped text. URL:', window.location.href);
            console.log('URL search params:', window.location.search);
            console.log('Found clipId:', clipId);
            
            if (clipId) {
                console.log('Found clipId in URL, loading clipped text:', clipId);
                
                // Fetch the clipped text from the server
                const response = await fetch(`/api/clipped-text/${clipId}`);
                
                if (response.ok) {
                    const result = await response.json();
                    const clippedData = result.data;
                    
                    // Handle different scenarios based on current app state
                    await handleClippedTextLoad(clippedData, clipId);
                    
                } else {
                    console.error('Failed to load clipped text:', response.status);
                    showNotification('Failed to load clipped text. It may have expired.', 'error');
                }
            }
        } catch (error) {
            console.error('Error checking for clipped text:', error);
        }
    }
    
    // Handle loading clipped text with proper workflow management
    async function handleClippedTextLoad(clippedData, clipId) {
        console.log('handleClippedTextLoad called with:', { clipId, clippedData });
        
        // Always prioritize new text - clear existing content
        const hadExistingText = state.editor ? state.editor.getText().trim().length > 0 : (textInput.textContent || '').trim().length > 0;
        const hadExistingCards = state.cards.length > 0;
        const hasDeckSelected = state.currentDeck && Object.keys(state.decks).length > 0;
        
        console.log('Current state:', { hadExistingText, hadExistingCards, hasDeckSelected });
        
        // Clear existing cards if any
        if (hadExistingCards) {
            state.cards = [];
            renderCards();
            updateButtonStates();
        }
        
        // Load the new text into the editor
        if (state.editor) {
            // Use Quill editor
            state.editor.setText(clippedData.text);
        } else {
            // Fallback to contenteditable
            textInput.textContent = clippedData.text;
        }
        
        // Show appropriate notification based on what was replaced
        const sourceInfo = clippedData.title || clippedData.source || 'webpage';
        let notificationMessage = `Loaded text from ${sourceInfo}`;
        
        if (hadExistingText || hadExistingCards) {
            notificationMessage += ' (replaced existing content)';
        }
        
        showNotification(notificationMessage, 'success', 5000);
        
        // Analyze the text for context
        if (clippedData.text.length > 100) {
            await analyzeDocumentContext(clippedData.text);
        }
        
        // Handle deck selection if needed
        if (!hasDeckSelected) {
            // Show deck selection modal immediately
            showNotification('Please select a deck to continue', 'info', 3000);
            setTimeout(() => {
                showFileSelectionModal();
            }, 1000);
        } else {
            // Deck is already selected, ready to generate cards
            showNotification('Ready to generate cards. Highlight text and click "Create Cards"', 'success', 4000);
        }
        
        // Clean up the URL (remove the clipId parameter)
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('clipId');
        window.history.replaceState({}, '', newUrl);
        
        // Delete the clipped text from server storage
        try {
            await fetch(`/api/clipped-text/${clipId}`, { method: 'DELETE' });
        } catch (deleteError) {
            console.warn('Failed to delete clipped text from server:', deleteError);
        }
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
            
            // Check if the error response has detailed information
            let errorMessage = 'Error analyzing text: ';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
                
                // If there's a suggestion, include it
                if (errorData.suggestion) {
                    errorMessage += `\n\nSuggestion: ${errorData.suggestion}`;
                }
            } else if (error.message) {
                // Provide a more specific message for timeout errors
                if (error.message.includes('FUNCTION_INVOCATION_TIMEOUT')) {
                    errorMessage = 'The request timed out. This can happen with very complex or lengthy text processing.';
                } else if (error.message.includes('timed out')) {
                    errorMessage = 'The request timed out. This can happen with very complex or lengthy text processing.';
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Please try again.';
            }
            
            // Show error notification but don't be too disruptive for analysis errors
            showNotification(errorMessage, 'error', 5000);
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
            
            // Check if the error response has detailed information
            let errorMessage = 'Error generating cards: ';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
                
                // If there's a suggestion, include it
                if (errorData.suggestion) {
                    errorMessage += `\n\nSuggestion: ${errorData.suggestion}`;
                }
            } else if (error.message) {
            // Provide a more specific message for timeout errors
                if (error.message.includes('FUNCTION_INVOCATION_TIMEOUT')) {
                    errorMessage = 'The request timed out. This can happen with very complex or lengthy text processing.';
                } else if (error.message.includes('timed out')) {
                    errorMessage = 'The request timed out. This can happen with very complex or lengthy text processing.';
            } else {
                    errorMessage += error.message;
            }
            } else {
                errorMessage += 'Please try again.';
            }
            
            showNotification(errorMessage, 'error');
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
                showNotification('No cards to save', 'info');
                return;
            }
            
            // Show loading indicator
            exportButton.disabled = true;
            const originalText = exportButton.textContent;
            exportButton.textContent = 'Saving...';
            
            // Try File System Access API first, fallback to download
            if (state.supportsFileSystemAPI && state.fileHandle) {
                try {
                    await saveCardsWithFSA();
                    return; // Success with FSA, exit early
                } catch (fsaError) {
                    console.warn('FSA save failed, falling back to download:', fsaError);
                    // Continue to fallback method below
                }
            }
            
            // Fallback: Use download method with incrementing
            await exportToAnkiFallback();
            
        } catch (error) {
            console.error('Error saving cards:', error);
            showNotification('Error saving cards. Try again.', 'error');
        } finally {
            // Reset button state
            exportButton.disabled = false;
            updateExportButtonText();
        }
    }

    async function exportToAnkiFallback() {
        // Format cards as TSV
        const tsvContent = formatCardsAsTSV(state.cards);
        
        // Determine filename with intelligent incrementing
        let filename;
        let isIncremented = false;
        if (state.currentFile) {
            if (state.isFirstSave) {
                // First save after creating new deck - use original filename
                filename = state.currentFile;
                state.isFirstSave = false; // Mark that we've done the first save
            } else {
                // Subsequent saves - increment the filename
                filename = getIncrementedFilename(state.currentFile);
                isIncremented = true;
            }
        } else {
            // Fallback for new files
            filename = `flashcards-${new Date().toISOString().slice(0, 10)}.tsv`;
        }
        
        // Update the current file to the new incremented name
        state.currentFile = filename;
        
        // Download the TSV file
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // Update UI to reflect new filename
        updateExportButtonText();
        
        // Success notification
        if (isIncremented) {
            showNotification(`${state.cards.length} cards saved to ${filename} (incremented to avoid overwriting)`, 'success');
        } else {
            showNotification(`${state.cards.length} cards saved to ${filename}!`, 'success');
        }
    }

    function getIncrementedFilename(currentFilename) {
        // Remove extension
        const ext = currentFilename.includes('.') ? '.' + currentFilename.split('.').pop() : '.tsv';
        const nameWithoutExt = currentFilename.replace(/\.[^/.]+$/, '');
        
        // Check if filename already has a number suffix like "-2"
        const numberMatch = nameWithoutExt.match(/^(.+)-(\d+)$/);
        
        if (numberMatch) {
            // File already has a number, increment it
            const baseName = numberMatch[1];
            const currentNumber = parseInt(numberMatch[2]);
            return `${baseName}-${currentNumber + 1}${ext}`;
        } else {
            // File doesn't have a number, add "-2"
            return `${nameWithoutExt}-2${ext}`;
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
            padding: 40px;
            border-radius: 12px;
            width: 450px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        modalContent.innerHTML = `
            <h2 style="margin-bottom: 15px; color: #333;">Choose Your Deck</h2>
            <p style="margin-bottom: 30px; color: #666; line-height: 1.5;">
                Create a new flashcard deck or load an existing one from a TSV file.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button id="createNewDeck" style="
                    padding: 15px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007bff'">
                    🆕 Create New Named Deck
                </button>
                
                <button id="loadExistingDeck" style="
                    padding: 15px 20px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#1e7e34'" onmouseout="this.style.backgroundColor='#28a745'">
                    📁 Load Existing TSV File
                </button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Add event listeners
        document.getElementById('createNewDeck').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            showNewDeckModal();
        });

        document.getElementById('loadExistingDeck').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            showLoadDeckModal();
        });
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
            padding: 40px;
            border-radius: 12px;
            width: 450px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        modalContent.innerHTML = `
            <h2 style="margin-bottom: 15px; color: #333;">Create New Deck</h2>
            <p style="margin-bottom: 25px; color: #666; line-height: 1.5;">
                Enter a name for your new flashcard deck. A TSV file will be created.
            </p>
            
            <input type="text" id="deckNameInput" placeholder="Enter deck name..." style="
                width: 100%;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 8px;
                margin-bottom: 25px;
                font-size: 16px;
                box-sizing: border-box;
            ">
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancelCreate" style="
                    padding: 12px 24px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#545b62'" onmouseout="this.style.backgroundColor='#6c757d'">
                    Cancel
                </button>
                <button id="createDeck" style="
                    padding: 12px 24px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007bff'">
                    Create Deck
                </button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const nameInput = document.getElementById('deckNameInput');
        const createButton = document.getElementById('createDeck');
        const cancelButton = document.getElementById('cancelCreate');

        // Focus on input
        nameInput.focus();

        // Handle Enter key
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createButton.click();
            }
        });

        createButton.addEventListener('click', () => {
            const deckName = nameInput.value.trim();
            if (!deckName) {
                showNotification('Please enter a deck name', 'warning');
                return;
            }

            createNewDeck(deckName);
            document.body.removeChild(modalOverlay);
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            showFileSelectionModal();
        });
    }

    function showLoadDeckModal() {
        if (state.supportsFileSystemAPI) {
            // Use File System Access API directly
            loadDeckWithFSA();
        } else {
            // Show file input modal for fallback
            showLoadDeckModalFallback();
        }
    }

    function showLoadDeckModalFallback() {
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
            padding: 40px;
            border-radius: 12px;
            width: 450px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        modalContent.innerHTML = `
            <h2 style="margin-bottom: 15px; color: #333;">Load Existing Deck</h2>
            <p style="margin-bottom: 25px; color: #666; line-height: 1.5;">
                Select a TSV file from your computer to load existing flashcards.
            </p>
            
            <input type="file" id="tsvFileInput" accept=".tsv,.txt" style="
                width: 100%;
                padding: 15px;
                border: 2px dashed #ddd;
                border-radius: 8px;
                margin-bottom: 25px;
                font-size: 16px;
                cursor: pointer;
                background: #f8f9fa;
            ">
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancelLoad" style="
                    padding: 12px 24px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#545b62'" onmouseout="this.style.backgroundColor='#6c757d'">
                    Cancel
                </button>
                <button id="loadTsv" style="
                    padding: 12px 24px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#1e7e34'" onmouseout="this.style.backgroundColor='#28a745'">
                    Load Deck
                </button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const fileInput = document.getElementById('tsvFileInput');
        const loadButton = document.getElementById('loadTsv');
        const cancelButton = document.getElementById('cancelLoad');

        loadButton.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a TSV file', 'warning');
                return;
            }

            loadTsvFile(file);
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
            showFileSelectionModal();
            dropdown.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        });

        // Add to dropdown
        dropdown.appendChild(loadFileOption);
        dropdown.appendChild(newFileOption);
    }

    // Initialize file management menu
    addFileManagementToMenu();

    // Log which file system mode is active
    if (state.supportsFileSystemAPI) {
        console.log('🚀 File System Access API supported - true file overwriting enabled');
    } else {
        console.log('📁 Using fallback mode - files will be incrementally named');
    }

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

    function loadTsvFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const lines = content.trim().split('\n');
                
                if (lines.length === 0) {
                    showNotification('File is empty', 'error');
                    return;
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
                    showNotification('No valid cards found in the file', 'error');
                    return;
                }

                // Update state
                state.cards = cards;
                state.currentFile = file.name;
                state.isFileLoaded = true;
                state.isFirstSave = false; // Loading existing file - next save should increment
                state.fileHandle = null; // No file handle in fallback mode
                
                // Update UI
                updateExportButtonText();
                renderCards();
                updateButtonStates();
                
                showNotification(`Loaded ${cards.length} cards from ${file.name}`, 'success');

            } catch (error) {
                console.error('Error parsing TSV file:', error);
                showNotification('Error parsing TSV file', 'error');
            }
        };

        reader.readAsText(file);
    }

    function createNewDeck(deckName) {
        if (state.supportsFileSystemAPI) {
            // Use File System Access API for true file creation
            createNewDeckWithFSA(deckName);
        } else {
            // Fallback to download method
            createNewDeckFallback(deckName);
        }
    }

    function createNewDeckFallback(deckName) {
        // Sanitize filename
        const sanitizedName = deckName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-');
        const filename = `${sanitizedName}.tsv`;
        
        // Create TSV content with just headers
        const tsvContent = 'Front\tBack\tDeck\n';
        
        // Download the empty TSV file to establish the file structure
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // Update state
        state.cards = [];
        state.currentFile = filename;
        state.isFileLoaded = true;
        state.isFirstSave = true; // Track that this is a new deck
        state.fileHandle = null; // No file handle in fallback mode
        
        // Update UI
        updateExportButtonText();
        renderCards();
        updateButtonStates();
        
        showNotification(`Created new deck: ${filename}`, 'success');
    }

    // ===== FILE SYSTEM ACCESS API FUNCTIONS =====

    async function createNewDeckWithFSA(deckName) {
        try {
            const filename = `${deckName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '-')}.tsv`;
            
            // Open save dialog
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'TSV files',
                    accept: { 'text/tab-separated-values': ['.tsv'] }
                }]
            });
            
            // Create initial TSV content with headers
            const tsvContent = 'Front\tBack\tDeck\n';
            
            // Write to file
            const writable = await fileHandle.createWritable();
            await writable.write(tsvContent);
            await writable.close();
            
            // Update state
            state.cards = [];
            state.currentFile = fileHandle.name;
            state.isFileLoaded = true;
            state.isFirstSave = false; // FSA doesn't need first save tracking
            state.fileHandle = fileHandle;
            
            // Update UI
            updateExportButtonText();
            renderCards();
            updateButtonStates();
            
            showNotification(`Created new deck: ${fileHandle.name}`, 'success');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled
                showNotification('Deck creation cancelled', 'info');
            } else {
                console.error('Error creating deck with FSA:', error);
                showNotification('Error creating deck: ' + error.message, 'error');
            }
        }
    }

    async function loadDeckWithFSA() {
        try {
            // Open file picker
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'TSV files',
                    accept: { 'text/tab-separated-values': ['.tsv', '.txt'] }
                }],
                multiple: false
            });
            
            // Read file content
            const file = await fileHandle.getFile();
            const content = await file.text();
            
            // Parse TSV content
            const cards = parseTsvContent(content);
            
            if (cards.length === 0) {
                showNotification('No valid cards found in the file', 'error');
                return;
            }
            
            // Update state
            state.cards = cards;
            state.currentFile = fileHandle.name;
            state.isFileLoaded = true;
            state.isFirstSave = false;
            state.fileHandle = fileHandle;
            
            // Update UI
            updateExportButtonText();
            renderCards();
            updateButtonStates();
            
            showNotification(`Loaded ${cards.length} cards from ${fileHandle.name}`, 'success');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled
                showNotification('File loading cancelled', 'info');
            } else {
                console.error('Error loading deck with FSA:', error);
                showNotification('Error loading deck: ' + error.message, 'error');
            }
        }
    }

    async function saveCardsWithFSA() {
        try {
            if (!state.fileHandle) {
                throw new Error('No file handle available');
            }
            
            // Format cards as TSV
            const tsvContent = formatCardsAsTSV(state.cards);
            
            // Write to file (overwrites existing content)
            const writable = await state.fileHandle.createWritable();
            await writable.write(tsvContent);
            await writable.close();
            
            showNotification(`${state.cards.length} cards saved to ${state.currentFile}!`, 'success');
            
        } catch (error) {
            console.error('Error saving with FSA:', error);
            showNotification('Error saving file: ' + error.message, 'error');
            throw error; // Re-throw to trigger fallback
        }
    }

    function parseTsvContent(content) {
        const lines = content.trim().split('\n');
        
        if (lines.length === 0) {
            return [];
        }

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

        return cards;
    }

    function formatCardsAsTSV(cards) {
        const tsvLines = ['Front\tBack\tDeck'];
        
        cards.forEach(card => {
            // Escape tabs and newlines in card content
            const front = (card.front || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
            const back = (card.back || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
            const deck = card.deck || 'General';
            
            tsvLines.push(`${front}\t${back}\t${deck}`);
        });
        
        return tsvLines.join('\n') + '\n';
    }
});
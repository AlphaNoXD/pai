document.addEventListener('DOMContentLoaded', () => {
    // API Endpoint (make sure this is your correct Vercel URL)
    const API_ENDPOINT = 'https://pai-navy.vercel.app/api/proxy';

    // DOM Elements
    const chatWindow = document.querySelector('.chat-window');
    const userInput = document.querySelector('.user-input');
    const sendBtn = document.querySelector('.send-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const historyList = document.querySelector('.history-list');

    // SVG Icons for buttons
    const pinIconSVG = `<svg viewBox="0 0 24 24"><path d="M16 3.01h-2v1.98h2v-1.98zm-6 0h-2v1.98h2v-1.98zm6 12h2v2h-2v-2zm-6 0h2v2h-2v-2zm-6-6h2v2H4v-2zm16 0h-2v2h2v-2zm-10 6h2v2h-2v-2zm-6-12h2v1.98H4V3.01zM8 17h2v2H8v-2zm8-12h2v1.98h-2V5.01zm-4 14h2v2h-2v-2zM8 5.01h2v1.98H8V5.01zm4 1.98c-1.1 0-2-.9-2-2h-2v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2h-2c0 1.1-.9 2-2 2z" fill-rule="evenodd"/></svg>`;
    const deleteIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"/></svg>`;

    // State Management
    let conversations = JSON.parse(localStorage.getItem('aiChatHistory')) || {};
    let currentChatId = null;

    // --- **THE FIX IS HERE** ---
    // This small block of code checks for old chat formats and updates them.
    Object.keys(conversations).forEach(id => {
        if (Array.isArray(conversations[id])) {
            console.log(`Updating old chat format for ID: ${id}`);
            conversations[id] = {
                messages: conversations[id], // The old array becomes the messages
                isPinned: false              // Add the default pinned status
            };
        }
    });
    // --- End of Fix ---


    // --- Core Functions ---
    const saveConversations = () => {
        localStorage.setItem('aiChatHistory', JSON.stringify(conversations));
    };

    const addMessage = (role, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.textContent = text;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const showTypingIndicator = () => {
        const indicator = document.createElement('div');
        indicator.className = 'message typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatWindow.appendChild(indicator);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return indicator;
    };

    // --- History Management ---
    const displayHistory = () => {
        historyList.innerHTML = '';
        const sortedIds = Object.keys(conversations).sort((a, b) => {
            const aPinned = conversations[a].isPinned;
            const bPinned = conversations[b].isPinned;
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return b.localeCompare(a);
        });

        sortedIds.forEach(id => {
            const conversation = conversations[id];
            const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
            
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.id = id;
            if (id === currentChatId) historyItem.classList.add('active');
            if (conversation.isPinned) historyItem.classList.add('pinned');

            const textSpan = document.createElement('span');
            textSpan.className = 'history-item-text';
            textSpan.textContent = firstUserMessage ? firstUserMessage.parts[0].text : 'New Chat';
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';

            const pinBtn = document.createElement('button');
            pinBtn.className = 'pin-btn';
            pinBtn.innerHTML = pinIconSVG;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = deleteIconSVG;

            actionsDiv.append(pinBtn, deleteBtn);
            historyItem.append(textSpan, actionsDiv);
            historyList.appendChild(historyItem);
        });
    };

    const loadChat = (id) => {
        if (!conversations[id]) return;
        currentChatId = id;
        chatWindow.innerHTML = '';
        conversations[id].messages.forEach(message => addMessage(message.role, message.parts[0].text));
        displayHistory();
    };

    const startNewChat = () => {
        currentChatId = `chat_${Date.now()}`;
        conversations[currentChatId] = { messages: [], isPinned: false };
        chatWindow.innerHTML = '';
        loadChat(currentChatId);
    };

    // --- Pin and Delete Handlers ---
    const handlePinToggle = (id) => {
        if (!conversations[id]) return;
        conversations[id].isPinned = !conversations[id].isPinned;
        saveConversations();
        displayHistory();
    };

    const handleDeleteChat = (id) => {
        if (!conversations[id]) return;
        if (confirm('Are you sure you want to delete this conversation?')) {
            delete conversations[id];
            saveConversations();
            if (currentChatId === id) {
                const remainingIds = Object.keys(conversations);
                if (remainingIds.length > 0) {
                    loadChat(remainingIds[0]);
                } else {
                    startNewChat();
                }
            } else {
                displayHistory();
            }
        }
    };

    // --- API Interaction ---
    const sendMessage = async () => {
        const userText = userInput.value.trim();
        if (!userText) return;

        if (!currentChatId || !conversations[currentChatId]) {
            startNewChat();
        }
        
        addMessage('user', userText);
        conversations[currentChatId].messages.push({ role: 'user', parts: [{ text: userText }] });
        userInput.value = '';

        const typingIndicator = showTypingIndicator();

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversations[currentChatId].messages })
            });
            
            chatWindow.removeChild(typingIndicator);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch response.');
            }

            const data = await response.json();
            const aiText = data.response;
            
            addMessage('model', aiText);
            conversations[currentChatId].messages.push({ role: 'model', parts: [{ text: aiText }] });
            saveConversations();
            displayHistory();

        } catch (error) {
            addMessage('ai', `Error: ${error.message}`);
        }
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());
    newChatBtn.addEventListener('click', startNewChat);

    historyList.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        if (!historyItem) return;
        const id = historyItem.dataset.id;
        
        if (e.target.closest('.pin-btn')) {
            handlePinToggle(id);
        } else if (e.target.closest('.delete-btn')) {
            handleDeleteChat(id);
        } else if (e.target.closest('.history-item-text')) {
            loadChat(id);
        }
    });

    // --- Initialization ---
    const savedIds = Object.keys(conversations);
    if (savedIds.length > 0) {
        const sortedIds = savedIds.sort((a, b) => {
            const aPinned = conversations[a].isPinned;
            const bPinned = conversations[b].isPinned;
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return b.localeCompare(a);
        });
        loadChat(sortedIds[0]);
    } else {
        startNewChat();
    }
});

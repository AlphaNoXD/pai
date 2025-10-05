document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = 'https://pai-navy.vercel.app/api/proxy';

    // DOM Elements
    const chatWindow = document.querySelector('.chat-window');
    const userInput = document.querySelector('.user-input');
    const sendBtn = document.querySelector('.send-btn');
    const imageBtn = document.querySelector('.image-btn'); // New button
    const newChatBtn = document.querySelector('.new-chat-btn');
    const historyList = document.querySelector('.history-list');

    // (The rest of your script.js remains largely the same, but we will replace it all to ensure consistency)
    // ... (Your SVG Icons, conversations, currentChatId variables) ...
    // SVG Icons for buttons
    const pinIconSVG = `<svg viewBox="0 0 24 24"><path d="M16 3.01h-2v1.98h2v-1.98zm-6 0h-2v1.98h2v-1.98zm6 12h2v2h-2v-2zm-6 0h2v2h-2v-2zm-6-6h2v2H4v-2zm16 0h-2v2h2v-2zm-10 6h2v2h-2v-2zm-6-12h2v1.98H4V3.01zM8 17h2v2H8v-2zm8-12h2v1.98h-2V5.01zm-4 14h2v2h-2v-2zM8 5.01h2v1.98H8V5.01zm4 1.98c-1.1 0-2-.9-2-2h-2v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2h-2c0 1.1-.9 2-2 2z" fill-rule="evenodd"/></svg>`;
    const deleteIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"/></svg>`;

    // State Management
    let conversations = JSON.parse(localStorage.getItem('aiChatHistory')) || {};
    let currentChatId = null;

    Object.keys(conversations).forEach(id => {
        if (Array.isArray(conversations[id])) {
            conversations[id] = { messages: conversations[id], isPinned: false };
        }
    });

    const saveConversations = () => {
        localStorage.setItem('aiChatHistory', JSON.stringify(conversations));
    };
    
    // UPDATED: Can now display text or images
    const addMessage = (role, content, type = 'chat') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        if (type === 'image') {
            const imageEl = document.createElement('img');
            // The image data is base64, so we format the src attribute this way
            imageEl.src = `data:image/png;base64,${content}`;
            imageEl.alt = "Generated Image";
            messageDiv.appendChild(imageEl);
        } else {
            messageDiv.textContent = content;
        }
        
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const showTypingIndicator = (text = '...') => {
        const indicator = document.createElement('div');
        indicator.className = 'message typing-indicator';
        if (text !== '...') {
             indicator.textContent = text;
        } else {
             indicator.innerHTML = '<span></span><span></span><span></span>';
        }
        chatWindow.appendChild(indicator);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return indicator;
    };

    // (Your displayHistory, loadChat, startNewChat, pin/delete handlers remain the same)
    // ...
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
        // Now handles image messages too
        conversations[id].messages.forEach(message => {
             addMessage(message.role, message.parts[0].text, message.parts[0].type);
        });
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
    
    // API Call for Chat
    const sendChatMessage = async () => {
        const userText = userInput.value.trim();
        if (!userText) return;

        if (!currentChatId || !conversations[currentChatId]) startNewChat();
        
        addMessage('user', userText);
        conversations[currentChatId].messages.push({ role: 'user', parts: [{ text: userText, type: 'chat' }] });
        userInput.value = '';
        const typingIndicator = showTypingIndicator();

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversations[currentChatId].messages, type: 'chat' })
            });
            
            chatWindow.removeChild(typingIndicator);
            if (!response.ok) throw new Error((await response.json()).error);

            const data = await response.json();
            addMessage('model', data.response, 'chat');
            conversations[currentChatId].messages.push({ role: 'model', parts: [{ text: data.response, type: 'chat' }] });
            saveConversations();
            displayHistory();
        } catch (error) {
            chatWindow.removeChild(typingIndicator);
            addMessage('ai', `Error: ${error.message}`);
        }
    };

    // NEW: API Call for Images
    const sendImageRequest = async () => {
        const userText = userInput.value.trim();
        if (!userText) return;

        if (!currentChatId || !conversations[currentChatId]) startNewChat();

        addMessage('user', `Image prompt: "${userText}"`);
        conversations[currentChatId].messages.push({ role: 'user', parts: [{ text: `Image prompt: "${userText}"`, type: 'chat' }] });
        userInput.value = '';
        const typingIndicator = showTypingIndicator('Generating image...');

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userText, type: 'image' })
            });

            chatWindow.removeChild(typingIndicator);
            if (!response.ok) throw new Error((await response.json()).error);

            const data = await response.json();
            addMessage('model', data.response, 'image'); // The response is the base64 string
            // Save the image data to history
            conversations[currentChatId].messages.push({ role: 'model', parts: [{ text: data.response, type: 'image' }] });
            saveConversations();
            displayHistory();

        } catch (error) {
            chatWindow.removeChild(typingIndicator);
            addMessage('ai', `Error: ${error.message}`);
        }
    };

    // Event Listeners
    sendBtn.addEventListener('click', sendChatMessage);
    imageBtn.addEventListener('click', sendImageRequest); // New listener
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendChatMessage());
    newChatBtn.addEventListener('click', startNewChat);

    historyList.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        if (!historyItem) return;
        const id = historyItem.dataset.id;
        if (e.target.closest('.pin-btn')) handlePinToggle(id);
        else if (e.target.closest('.delete-btn')) handleDeleteChat(id);
        else if (e.target.closest('.history-item-text')) loadChat(id);
    });

    // Initialization
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

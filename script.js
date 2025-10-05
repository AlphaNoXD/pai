document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace this with the URL of your deployed serverless function
    // This is the secure way to handle your API key.
    const API_ENDPOINT = 'YOUR_SERVERLESS_FUNCTION_URL';

    // DOM Elements
    const chatWindow = document.querySelector('.chat-window');
    const userInput = document.querySelector('.user-input');
    const sendBtn = document.querySelector('.send-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const historyList = document.querySelector('.history-list');

    // State Management
    let conversations = JSON.parse(localStorage.getItem('aiChatHistory')) || {};
    let currentChatId = null;

    // --- Core Functions ---
    const saveConversations = () => {
        localStorage.setItem('aiChatHistory', JSON.stringify(conversations));
    };

    const addMessage = (role, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.textContent = text;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to the bottom
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
        Object.keys(conversations).forEach(id => {
            const firstUserMessage = conversations[id].find(msg => msg.role === 'user');
            if (firstUserMessage) {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.textContent = firstUserMessage.parts[0].text;
                historyItem.dataset.id = id;
                if (id === currentChatId) {
                    historyItem.classList.add('active');
                }
                historyList.appendChild(historyItem);
            }
        });
    };

    const loadChat = (id) => {
        if (!conversations[id]) return;
        currentChatId = id;
        chatWindow.innerHTML = '';
        conversations[id].forEach(message => addMessage(message.role, message.parts[0].text));
        displayHistory();
    };

    const startNewChat = () => {
        currentChatId = `chat_${Date.now()}`;
        conversations[currentChatId] = [];
        chatWindow.innerHTML = '';
        saveConversations();
        displayHistory();
    };

    // --- API Interaction ---
    const sendMessage = async () => {
        const userText = userInput.value.trim();
        if (!userText) return;

        if (!currentChatId || !conversations[currentChatId]) {
            startNewChat();
        }
        
        addMessage('user', userText);
        conversations[currentChatId].push({ role: 'user', parts: [{ text: userText }] });
        userInput.value = '';

        const typingIndicator = showTypingIndicator();

        try {
            if (API_ENDPOINT === 'YOUR_SERVERLESS_FUNCTION_URL') {
                throw new Error("API endpoint is not configured. Please follow deployment instructions.");
            }
            // THE FIX IS HERE: We send the entire conversation history for context.
            // The serverless function will then add the API key and forward this to Google.
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversations[currentChatId] })
            });
            
            chatWindow.removeChild(typingIndicator); // Remove typing indicator

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch response.');
            }

            const data = await response.json();
            const aiText = data.response;
            
            addMessage('ai', aiText); // 'ai' role for styling
            conversations[currentChatId].push({ role: 'model', parts: [{ text: aiText }] });
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
        if (e.target.classList.contains('history-item')) {
            loadChat(e.target.dataset.id);
        }
    });

    // --- Initialization ---
    const savedIds = Object.keys(conversations);
    if (savedIds.length > 0) {
        loadChat(savedIds[savedIds.length - 1]); // Load the most recent chat
    } else {
        startNewChat();
    }
});
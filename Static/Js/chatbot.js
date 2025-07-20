// chatbot.js - Handles all chatbot functionality

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');
    const exportChatBtn = document.getElementById('export-chat-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');

    // Chat state
    let currentChat = [];
    let chatHistory = [];
    let isWaitingForResponse = false;

    // Initialize
    loadChatHistory();
    setupEventListeners();

    // ===== Event Listeners =====
    function setupEventListeners() {
        // Send message on button click or Enter key
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isWaitingForResponse) {
                sendMessage();
            }
        });

        // New chat button
        newChatBtn.addEventListener('click', startNewChat);

        // Export chat button
        exportChatBtn.addEventListener('click', exportChat);

        // Voice button (placeholder functionality)
        voiceBtn.addEventListener('click', () => {
            alert('Voice input would be implemented here');
        });

        // Toggle sidebar on mobile
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // ===== Core Chat Functions =====
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isWaitingForResponse) return;

        // Add user message to UI
        addMessage(message, 'user');
        chatInput.value = '';
        isWaitingForResponse = true;
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Send message to Flask backend
            const response = await fetch('/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Add bot response to UI
            addMessage(data.response, 'bot');
            
            // Update chat history
            currentChat.push({ 
                user: message, 
                bot: data.response,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage("Sorry, I encountered an error. Please try again.", 'bot');
        } finally {
            isWaitingForResponse = false;
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        // Format URLs as clickable links
        const formattedText = text.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Preserve line breaks and add link styling
        messageDiv.innerHTML = formattedText.replace(/\n/g, '<br>');
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // ===== Chat History Management =====
    function startNewChat() {
        if (currentChat.length > 0) {
            // Save current chat to history
            const timestamp = new Date().toLocaleString();
            chatHistory.push({
                id: Date.now(),
                title: currentChat[0].user.substring(0, 30) + (currentChat[0].user.length > 30 ? '...' : ''),
                timestamp: timestamp,
                messages: [...currentChat]
            });
            
            // Update chat history UI
            updateChatHistoryUI();
            
            // Save to localStorage
            saveChatHistory();
        }
        
        // Clear current chat
        currentChat = [];
        messagesContainer.innerHTML = '<div class="chat-message bot">Hello! I\'m your MindPal assistant powered by Gemini. How can I help you today?</div>';
    }

    async function loadChatHistory() {
        try {
            // First try to load from server
            const response = await fetch('/get_chats');
            
            if (response.ok) {
                const data = await response.json();
                if (data.chats && data.chats.length > 0) {
                    // Process server chat history
                    const processedChats = processServerChats(data.chats);
                    if (processedChats.length > 0) {
                        chatHistory = [{
                            id: Date.now(),
                            title: 'Previous Conversation',
                            timestamp: new Date().toLocaleString(),
                            messages: processedChats
                        }];
                        updateChatHistoryUI();
                        return;
                    }
                }
            }
            
            // Fallback to localStorage if no server history
            const savedHistory = localStorage.getItem('mindpalChatHistory');
            if (savedHistory) {
                chatHistory = JSON.parse(savedHistory);
                updateChatHistoryUI();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function processServerChats(serverChats) {
        const processed = [];
        let currentUserMessage = null;
        
        serverChats.forEach(chat => {
            if (chat.message.startsWith('You: ')) {
                currentUserMessage = chat.message.substring(5);
            } else if (chat.message.startsWith('Bot: ') && currentUserMessage) {
                processed.push({
                    user: currentUserMessage,
                    bot: chat.message.substring(5),
                    timestamp: chat.timestamp
                });
                currentUserMessage = null;
            }
        });
        
        return processed;
    }

    function saveChatHistory() {
        localStorage.setItem('mindpalChatHistory', JSON.stringify(chatHistory));
    }

    function updateChatHistoryUI() {
        chatHistoryList.innerHTML = '';
        chatHistory.forEach(chat => {
            const li = document.createElement('li');
            li.className = 'history-entry';
            li.innerHTML = `
                <span>${chat.title}</span>
                <small>${chat.timestamp}</small>
            `;
            li.addEventListener('click', () => loadChat(chat.id));
            chatHistoryList.appendChild(li);
        });
    }

    function loadChat(chatId) {
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        messagesContainer.innerHTML = '';
        chat.messages.forEach(msg => {
            addMessage(msg.user, 'user');
            addMessage(msg.bot, 'bot');
        });
        
        // Set as current chat
        currentChat = [...chat.messages];
    }

    // ===== Export Functionality =====
    function exportChat() {
        if (currentChat.length === 0 && chatHistory.length === 0) {
            alert('No chat history to export');
            return;
        }
        
        let exportContent = 'MindPal Chat History\n===================\n\n';
        
        // Add current chat if exists
        if (currentChat.length > 0) {
            exportContent += 'Current Conversation:\n';
            currentChat.forEach(msg => {
                exportContent += `You: ${msg.user}\n`;
                exportContent += `Bot: ${msg.bot}\n\n`;
            });
        }
        
        // Add chat history
        if (chatHistory.length > 0) {
            exportContent += '\nPast Conversations:\n';
            chatHistory.forEach(chat => {
                exportContent += `\n${chat.title} (${chat.timestamp})\n`;
                chat.messages.forEach(msg => {
                    exportContent += `You: ${msg.user}\n`;
                    exportContent += `Bot: ${msg.bot}\n\n`;
                });
            });
        }
        
        // Create download link
        const blob = new Blob([exportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindpal_chat_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
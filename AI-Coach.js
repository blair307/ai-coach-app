// Corrected ai-coach.js with the right element IDs from your HTML

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AI Coach page loaded');
    initializePage();
    loadChatHistory();
});

// Initialize page elements and event listeners
function initializePage() {
    console.log('🔍 Looking for page elements...');
    
    // Use the correct IDs from your HTML
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('messageInput');
    
    console.log('📝 Input field (messageInput):', userInput ? 'Found ✅' : 'Not found ❌');
    console.log('🔘 Send button (sendButton):', sendButton ? 'Found ✅' : 'Not found ❌');
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
        console.log('✅ Send button event listener added');
    } else {
        console.error('❌ Send button not found');
    }
    
    if (userInput) {
        userInput.addEventListener('keypress', handleKeyPress);
        console.log('✅ Input field event listener added');
    } else {
        console.error('❌ User input field not found');
    }
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Main function to send messages
async function sendMessage() {
    console.log('📤 Send message function called');
    
    // Use the correct ID from your HTML
    const userInput = document.getElementById('messageInput');
    if (!userInput) {
        console.error('❌ User input element (messageInput) not found');
        return;
    }
    
    const message = userInput.value.trim();
    console.log('📝 Message to send:', message);
    
    if (!message) {
        console.log('⚠️ Empty message, not sending');
        return;
    }
    
    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        console.log('🚀 Calling AI...');
        
        // Get conversation history
        const conversationHistory = getConversationHistory();
        
        // Call AI with backend
        const response = await callOpenAI(message, conversationHistory);
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        addMessage(response, 'ai');
        
        // Save conversation history
        saveConversationHistory(message, response);
        
        console.log('✅ Message sent successfully');
        
    } catch (error) {
        console.error('❌ Error in sendMessage:', error);
        hideTypingIndicator();
        addMessage("I'm having trouble responding right now. Please try again in a moment.", 'ai');
    }
}

// Call your backend API
async function callOpenAI(message, conversationHistory = []) {
    try {
        console.log('🔍 Looking for auth token...');
        
        // Get the auth token
        const token = localStorage.getItem('eeh_token') || 
                     localStorage.getItem('auth_token') || 
                     localStorage.getItem('token');
        
        console.log('🔑 Token found:', token ? 'Yes' : 'No');
        
        if (!token) {
            console.log('❌ No auth token found, redirecting to login');
            window.location.href = 'login.html';
            return "Please log in to continue.";
        }

        console.log('📡 Calling backend API...');

        // Call your Render backend
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                chatHistory: conversationHistory
            })
        });

        console.log('📊 Backend response status:', response.status);

        const data = await response.json();
        console.log('📄 Backend response data:', data);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log('🔒 Token expired, redirecting to login');
                localStorage.removeItem('eeh_token');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return "Session expired. Please log in again.";
            }
            throw new Error(data.message || 'Server error');
        }

        console.log('✅ Got real AI response from your custom Assistant!');
        return data.response;

    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Entrepreneur-focused fallback messages
        const fallbacks = [
            "I'm experiencing technical difficulties right now. As an entrepreneur, you know that setbacks are temporary. While I get back online, remember that seeking support shows leadership strength, not weakness.",
            "I'm having connection issues at the moment. In the meantime, consider this: the stress you're feeling as an entrepreneur is valid. Take a deep breath and remember that even the most successful founders face similar challenges.",
            "Technical problems on my end right now. Here's a quick reminder while I reconnect: entrepreneurship is inherently stressful, but you're building something meaningful. That pressure you feel? It's often proportional to the impact you're creating."
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// Add message to chat display
function addMessage(message, type) {
    // Look for your chat container - from the HTML I saw it might be 'chatMessages'
    const chatContainer = document.getElementById('chatMessages') || 
                         document.getElementById('chat-container') || 
                         document.querySelector('.chat-messages') ||
                         document.querySelector('.chat-container');
    
    if (!chatContainer) {
        console.error('❌ Chat container not found');
        console.log('🔍 Looking for these containers:', 
                   'chatMessages, chat-container, .chat-messages, .chat-container');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(timestamp);
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    console.log(`💬 Added ${type} message:`, message.substring(0, 50) + '...');
}

// Show typing indicator
function showTypingIndicator() {
    const existingIndicator = document.getElementById('typing-indicator');
    if (existingIndicator) {
        return; // Already showing
    }
    
    const chatContainer = document.getElementById('chatMessages') || 
                         document.getElementById('chat-container') || 
                         document.querySelector('.chat-messages') ||
                         document.querySelector('.chat-container');
    
    if (!chatContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message ai-message typing';
    typingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    console.log('⏳ Showing typing indicator');
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
        console.log('✅ Hiding typing indicator');
    }
}

// Get conversation history from localStorage
function getConversationHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('eeh_conversation_history') || '[]');
        return history.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    } catch (error) {
        console.error('❌ Error loading conversation history:', error);
        return [];
    }
}

// Save conversation history to localStorage
function saveConversationHistory(userMessage, aiResponse) {
    try {
        let history = JSON.parse(localStorage.getItem('eeh_conversation_history') || '[]');
        
        // Add new messages
        history.push(
            { type: 'user', content: userMessage, timestamp: new Date().toISOString() },
            { type: 'ai', content: aiResponse, timestamp: new Date().toISOString() }
        );
        
        // Keep only last 50 messages to manage storage
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        localStorage.setItem('eeh_conversation_history', JSON.stringify(history));
        console.log('💾 Saved conversation history');
    } catch (error) {
        console.error('❌ Error saving conversation history:', error);
    }
}

// Load existing chat history on page load
function loadChatHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('eeh_conversation_history') || '[]');
        
        // Display last 20 messages
        const recentHistory = history.slice(-20);
        
        recentHistory.forEach(msg => {
            addMessage(msg.content, msg.type);
        });
        
        console.log(`📚 Loaded ${recentHistory.length} previous messages`);
    } catch (error) {
        console.error('❌ Error loading chat history:', error);
    }
}

console.log('📝 AI Coach JavaScript loaded successfully with correct element IDs');

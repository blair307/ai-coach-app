// AI Coach JavaScript Functions

// Configuration
const OPENAI_API_KEY = 'your-openai-api-key-here'; // You'll need to replace this
const API_BASE_URL = 'https://ai-coach-backend-mytn.onrender.com';

// Chat state
let chatHistory = [];
let isWaitingForResponse = false;

// Initialize the chat when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadChatHistory();
    checkAuthStatus();
    initializeChat();
});

// Check if user is authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user data
    loadUserData();
}

// Load user data from your backend
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // Update UI with user data if needed
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load chat history from your backend
async function loadChatHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const history = await response.json();
            chatHistory = history.messages || [];
            displayChatHistory();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        // Continue with empty history if loading fails
    }
}

// Display existing chat history
function displayChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Clear existing messages (except welcome message)
    const welcomeMessage = messagesContainer.querySelector('.coach-message');
    messagesContainer.innerHTML = '';
    if (welcomeMessage) {
        messagesContainer.appendChild(welcomeMessage);
    }
    
    // Add historical messages
    chatHistory.forEach(message => {
        addMessageToChat(message.content, message.role, message.timestamp, false);
    });
    
    scrollToBottom();
}

// Initialize chat functionality
function initializeChat() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    // Enable send button when there's text
    messageInput.addEventListener('input', function() {
        sendButton.disabled = !this.value.trim() || isWaitingForResponse;
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

// Handle enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message to AI coach
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || isWaitingForResponse) return;
    
    // Clear input and disable send button
    messageInput.value = '';
    messageInput.style.height = 'auto';
    isWaitingForResponse = true;
    updateSendButton();
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Send to OpenAI API through your backend
        const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                message: message,
                chatHistory: chatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response from AI coach');
        }
        
        const data = await response.json();
        
        // Add AI response to chat
        addMessageToChat(data.response, 'assistant');
        
        // Save to chat history
        saveChatHistory();
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToChat(
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", 
            'assistant'
        );
    } finally {
        hideTypingIndicator();
        isWaitingForResponse = false;
        updateSendButton();
    }
}

// Add message to chat display
function addMessageToChat(content, role, timestamp = null, shouldSave = true) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    const isUser = role === 'user';
    const messageTime = timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.className = `message ${isUser ? 'user-message' : 'coach-message'}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${isUser ? '👤' : '🤖'}</div>
        <div class="message-content">
            <div class="message-text">${content}</div>
            <div class="message-time">${messageTime}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Add to chat history
    if (shouldSave) {
        chatHistory.push({
            role: role,
            content: content,
            timestamp: messageTime
        });
    }
}

// Save chat history to backend
async function saveChatHistory() {
    try {
        await fetch(`${API_BASE_URL}/api/chat/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                messages: chatHistory
            })
        });
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'flex';
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    indicator.style.display = 'none';
}

// Update send button state
function updateSendButton() {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    sendButton.disabled = !messageInput.value.trim() || isWaitingForResponse;
    sendButton.textContent = isWaitingForResponse ? 'Sending...' : 'Send Message';
}

// Scroll to bottom of chat
function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Clear chat history
function clearChat() {
    if (confirm('Are you sure you want to clear this chat? This action cannot be undone.')) {
        chatHistory = [];
        const messagesContainer = document.getElementById('chatMessages');
        
        // Keep only the welcome message
        const welcomeMessage = messagesContainer.querySelector('.coach-message');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }
        
        // Clear from backend
        saveChatHistory();
    }
}

// Export chat history
function exportChat() {
    const chatData = {
        exportDate: new Date().toISOString(),
        messages: chatHistory
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-coach-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Select quick topic
function selectTopic(topic) {
    const topicPrompts = {
        career: "I'd like to discuss my career growth and professional development.",
        relationships: "I want to work on improving my relationships with others.",
        health: "I'd like to focus on my health and wellness goals.",
        personal: "I want to work on personal development and self-improvement.",
        stress: "I need help managing stress and finding better work-life balance.",
        goals: "I want to set clear goals and create a plan to achieve them."
    };
    
    const messageInput = document.getElementById('messageInput');
    messageInput.value = topicPrompts[topic] || '';
    messageInput.focus();
    
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    
    updateSendButton();
}

// Add new goal
function addGoal() {
    const goalText = prompt('What goal would you like to add for this session?');
    if (goalText && goalText.trim()) {
        const goalsList = document.getElementById('sessionGoals');
        const goalId = 'goal' + Date.now();
        
        const goalDiv = document.createElement('div');
        goalDiv.className = 'goal-item';
        goalDiv.innerHTML = `
            <input type="checkbox" id="${goalId}">
            <label for="${goalId}">${goalText.trim()}</label>
        `;
        
        goalsList.appendChild(goalDiv);
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

// Add notification badge update function
function updateNotificationBadge() {
    // This would typically fetch from your backend
    fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const badge = document.getElementById('notificationBadge');
        if (badge && data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline';
        } else if (badge) {
            badge.style.display = 'none';
        }
    })
    .catch(error => console.error('Error updating notification badge:', error));
}

// Update notification badge on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationBadge();
    
    // Update every 30 seconds
    setInterval(updateNotificationBadge, 30000);
});

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    // Adjust chat container height on mobile
    if (window.innerWidth <= 768) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.height = 'calc(60vh - 2rem)';
        }
    }
});

// Auto-save drafts (optional feature)
let draftTimer;
function saveDraft() {
    const messageInput = document.getElementById('messageInput');
    const draft = messageInput.value.trim();
    
    if (draft) {
        localStorage.setItem('chatDraft', draft);
    } else {
        localStorage.removeItem('chatDraft');
    }
}

// Load draft on page load
function loadDraft() {
    const draft = localStorage.getItem('chatDraft');
    if (draft) {
        const messageInput = document.getElementById('messageInput');
        messageInput.value = draft;
        updateSendButton();
    }
}

// Set up draft auto-save
document.addEventListener('DOMContentLoaded', function() {
    loadDraft();
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(saveDraft, 1000); // Save after 1 second of no typing
        });
        
        // Clear draft when message is sent
        const originalSendMessage = sendMessage;
        sendMessage = function() {
            localStorage.removeItem('chatDraft');
            return originalSendMessage();
        };
    }
});

// Error handling for network issues
function handleNetworkError(error) {
    console.error('Network error:', error);
    
    // Show user-friendly error message
    addMessageToChat(
        "I'm having trouble connecting to the server. Please check your internet connection and try again.",
        'assistant'
    );
    
    // Re-enable input
    isWaitingForResponse = false;
    updateSendButton();
    hideTypingIndicator();
}

// Retry mechanism for failed requests
async function retryRequest(requestFn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

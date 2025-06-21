// Complete Fixed AI Coach JavaScript - Backend URL + Token Fix

console.log('🚀 Starting EEH AI Coach...');

// Your Render backend URL
const BACKEND_URL = 'https://ai-coach-backend-pbse.onrender.com';

// Wait for page to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded, setting up chat...');
    setTimeout(setupChat, 1000);
});

// Setup function that finds elements
function setupChat() {
    console.log('🔍 Looking for chat elements...');
    
    const inputField = findInputField();
    const sendButton = findSendButton();
    
    if (inputField && sendButton) {
        console.log('✅ Found both input and button!');
        
        sendButton.onclick = function() {
            console.log('🔘 Button clicked!');
            sendMessageNow();
        };
        
        inputField.onkeypress = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                console.log('⌨️ Enter key pressed!');
                sendMessageNow();
            }
        };
        
        console.log('✅ Chat is ready to use!');
    } else {
        console.error('❌ Could not find chat elements');
    }
}

// Smart function to find input field
function findInputField() {
    const possibilities = [
        document.getElementById('messageInput'),
        document.getElementById('user-input'),
        document.getElementById('chat-input'),
        document.querySelector('textarea'),
        document.querySelector('input[type="text"]')
    ];
    
    for (let element of possibilities) {
        if (element) {
            console.log('✅ Found input field:', element.id || element.className);
            return element;
        }
    }
    return null;
}

// Smart function to find send button
function findSendButton() {
    const possibilities = [
        document.getElementById('sendButton'),
        document.getElementById('send-btn'),
        document.querySelector('button[onclick*="sendMessage"]'),
        document.querySelector('.btn-primary'),
        document.querySelector('button')
    ];
    
    for (let element of possibilities) {
        if (element) {
            console.log('✅ Found send button:', element.id || element.className);
            return element;
        }
    }
    return null;
}

// Get proper auth token
function getAuthToken() {
    // Try different token storage methods
    const possibleTokens = [
        localStorage.getItem('eeh_token'),
        localStorage.getItem('authToken'), 
        localStorage.getItem('auth_token'),
        localStorage.getItem('token')
    ];
    
    // Find the first non-null token
    for (let token of possibleTokens) {
        if (token && token !== 'null' && token !== 'undefined') {
            console.log('🔑 Found valid token:', token.substring(0, 20) + '...');
            return token;
        }
    }
    
    console.log('❌ No valid token found');
    return null;
}

// Main send message function
function sendMessageNow() {
    console.log('📤 Sending message...');
    
    const inputField = findInputField();
    if (!inputField) {
        console.error('❌ Cannot find input field');
        return;
    }
    
    const message = inputField.value.trim();
    console.log('📝 Message:', message);
    
    if (!message) {
        console.log('⚠️ Empty message');
        return;
    }
    
    // Clear input
    inputField.value = '';
    
    // Add message to chat
    addMessageToChat(message, 'user');
    
    // Show thinking message
    addMessageToChat('Thinking...', 'ai', true);
    
    // Call AI
    callAI(message);
}

// Add message to chat display
function addMessageToChat(message, type, isTemporary = false) {
    console.log(`💬 Adding ${type} message: ${message}`);
    
    const chatContainer = findChatContainer();
    if (!chatContainer) {
        console.error('❌ Cannot find chat container');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    if (isTemporary) messageDiv.id = 'thinking-message';
    
    messageDiv.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Find chat container
function findChatContainer() {
    const possibilities = [
        document.getElementById('chatMessages'),
        document.getElementById('chat-messages'),
        document.getElementById('chat-container'),
        document.querySelector('.chat-messages'),
        document.querySelector('.chat-container')
    ];
    
    for (let element of possibilities) {
        if (element) {
            console.log('✅ Found chat container:', element.id || element.className);
            return element;
        }
    }
    return null;
}

// Call your AI backend with token fix
async function callAI(message) {
    console.log('🤖 Calling Render backend...');
    
    try {
        // Get auth token with enhanced checking
        const token = getAuthToken();
        
        if (!token) {
            removeThinkingMessage();
            addMessageToChat('Please log in to continue. No valid authentication token found.', 'ai');
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        console.log('📡 Calling:', `${BACKEND_URL}/api/chat/send`);
        console.log('🔑 Using token:', token.substring(0, 20) + '...');
        
        const response = await fetch(`${BACKEND_URL}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                chatHistory: []
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        // Remove thinking message
        removeThinkingMessage();
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Got AI response from your custom Assistant!');
            console.log('🤖 Response preview:', data.response.substring(0, 100) + '...');
            addMessageToChat(data.response, 'ai');
            
        } else if (response.status === 401 || response.status === 403) {
            // Token is invalid/expired
            console.log('🔒 Authentication failed - token invalid or expired');
            
            // Try to get error details
            const errorData = await response.json().catch(() => ({}));
            console.log('❌ Auth error details:', errorData);
            
            // Clear all tokens and redirect to login
            localStorage.removeItem('eeh_token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
            
            addMessageToChat('Your session has expired. Please log in again.', 'ai');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            // Other backend error
            const errorData = await response.text().catch(() => 'Unknown error');
            console.log('❌ Backend error:', response.status, errorData);
            addMessageToChat(`Backend error (${response.status}). Please try again or contact support.`, 'ai');
        }
        
    } catch (error) {
        console.error('❌ Error calling backend:', error);
        removeThinkingMessage();
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            addMessageToChat('Cannot connect to backend. Please check your internet connection.', 'ai');
        } else {
            addMessageToChat('Technical error: ' + error.message, 'ai');
        }
    }
}

// Remove thinking message
function removeThinkingMessage() {
    const thinkingMsg = document.getElementById('thinking-message');
    if (thinkingMsg) {
        thinkingMsg.remove();
    }
}

console.log('✅ AI Coach script loaded with Render backend and token fixes!');

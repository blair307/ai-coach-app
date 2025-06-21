// Foolproof AI Coach JavaScript - Will work with any element names

console.log('🚀 Starting EEH AI Coach...');

// Wait for page to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded, setting up chat...');
    setTimeout(setupChat, 1000); // Wait 1 second to make sure everything is loaded
});

// Setup function that finds elements no matter what they're called
function setupChat() {
    console.log('🔍 Looking for chat elements...');
    
    // Find the input field - try every possible way
    const inputField = findInputField();
    const sendButton = findSendButton();
    
    if (inputField && sendButton) {
        console.log('✅ Found both input and button!');
        
        // Add click event to button
        sendButton.onclick = function() {
            console.log('🔘 Button clicked!');
            sendMessageNow();
        };
        
        // Add Enter key event to input
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
        if (!inputField) console.error('❌ Input field not found');
        if (!sendButton) console.error('❌ Send button not found');
    }
}

// Smart function to find input field
function findInputField() {
    // Try all possible ways to find the input
    const possibilities = [
        document.getElementById('messageInput'),
        document.getElementById('user-input'),
        document.getElementById('chat-input'),
        document.getElementById('message-input'),
        document.querySelector('textarea'),
        document.querySelector('input[type="text"]'),
        document.querySelector('.chat-input'),
        document.querySelector('.message-input')
    ];
    
    for (let element of possibilities) {
        if (element) {
            console.log('✅ Found input field:', element.id || element.className || 'no ID/class');
            return element;
        }
    }
    
    console.log('❌ Could not find input field anywhere');
    return null;
}

// Smart function to find send button
function findSendButton() {
    // Try all possible ways to find the button
    const possibilities = [
        document.getElementById('sendButton'),
        document.getElementById('send-btn'),
        document.getElementById('send-button'),
        document.querySelector('button[onclick*="sendMessage"]'),
        document.querySelector('.btn-primary'),
        document.querySelector('button')
    ];
    
    for (let element of possibilities) {
        if (element) {
            console.log('✅ Found send button:', element.id || element.className || 'no ID/class');
            return element;
        }
    }
    
    console.log('❌ Could not find send button anywhere');
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
    
    // Find chat container
    const chatContainer = findChatContainer();
    if (!chatContainer) {
        console.error('❌ Cannot find chat container');
        return;
    }
    
    // Create message element
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
    
    console.log('❌ Could not find chat container');
    return null;
}

// Call your AI backend
async function callAI(message) {
    console.log('🤖 Calling AI backend...');
    
    try {
        // Get auth token
        const token = localStorage.getItem('eeh_token') || 
                     localStorage.getItem('auth_token') || 
                     localStorage.getItem('token');
        
        console.log('🔑 Token found:', token ? 'Yes' : 'No');
        
        if (!token) {
            removeThinkingMessage();
            addMessageToChat('Please log in to continue.', 'ai');
            return;
        }
        
        // Call your backend
        const response = await fetch('/api/chat/send', {
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
            console.log('✅ Got AI response!');
            addMessageToChat(data.response, 'ai');
        } else {
            console.log('❌ Backend error:', response.status);
            addMessageToChat('Sorry, I\'m having trouble right now. Please try again.', 'ai');
        }
        
    } catch (error) {
        console.error('❌ Error calling AI:', error);
        removeThinkingMessage();
        addMessageToChat('I\'m experiencing technical difficulties. Please try again.', 'ai');
    }
}

// Remove thinking message
function removeThinkingMessage() {
    const thinkingMsg = document.getElementById('thinking-message');
    if (thinkingMsg) {
        thinkingMsg.remove();
    }
}

console.log('✅ AI Coach script loaded!');

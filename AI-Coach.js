// Complete Fixed AI Coach JavaScript - Backend URL + Token Fix + Working Settings

console.log('🚀 Starting EEH AI Coach...');

// Your Render backend URL
const BACKEND_URL = 'https://ai-coach-backend-pbse.onrender.com';

// Settings object
let coachSettings = {
    autoSave: true,
    typingIndicator: true,
    soundNotifications: false,
    coachingTone: 'supportive',
    responseLength: 'moderate',
    dataAnalytics: true,
    personalizedInsights: true,
    sessionReminder: 'weekly'
};

// Wait for page to fully load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded, setting up chat...');
    loadSettings();
    setTimeout(setupChat, 1000);
});

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('eeh_coach_settings');
    if (savedSettings) {
        coachSettings = { ...coachSettings, ...JSON.parse(savedSettings) };
        console.log('⚙️ Loaded saved settings:', coachSettings);
    }
}

// Save settings to localStorage
function saveSettingsToStorage() {
    localStorage.setItem('eeh_coach_settings', JSON.stringify(coachSettings));
    console.log('💾 Settings saved:', coachSettings);
}

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
    
    // Show thinking message if enabled
    if (coachSettings.typingIndicator) {
        addMessageToChat('Thinking...', 'ai', true);
    }
    
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
    
    // Auto-save if enabled
    if (coachSettings.autoSave && !isTemporary) {
        saveConversationToStorage();
    }
    
    // Play sound notification if enabled
    if (coachSettings.soundNotifications && type === 'ai' && !isTemporary) {
        playNotificationSound();
    }
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
        
        // Include coaching style preferences in the request
        const requestBody = {
            message: message,
            chatHistory: [],
            preferences: {
                tone: coachSettings.coachingTone,
                responseLength: coachSettings.responseLength
            }
        };
        
        const response = await fetch(`${BACKEND_URL}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
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

// SETTINGS FUNCTIONALITY

// Toggle settings modal
function toggleSettings() {
    console.log('⚙️ Opening settings modal...');
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        populateSettingsForm();
    }
}

// Close settings modal
function closeSettings() {
    console.log('❌ Closing settings modal...');
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Populate settings form with current values
function populateSettingsForm() {
    console.log('📝 Populating settings form...');
    
    // Chat preferences
    const autoSaveCheckbox = document.getElementById('autoSave');
    if (autoSaveCheckbox) autoSaveCheckbox.checked = coachSettings.autoSave;
    
    const typingIndicatorCheckbox = document.getElementById('typingIndicator');
    if (typingIndicatorCheckbox) typingIndicatorCheckbox.checked = coachSettings.typingIndicator;
    
    const soundNotificationsCheckbox = document.getElementById('soundNotifications');
    if (soundNotificationsCheckbox) soundNotificationsCheckbox.checked = coachSettings.soundNotifications;
    
    // Coaching style
    const coachingToneSelect = document.getElementById('coachingTone');
    if (coachingToneSelect) coachingToneSelect.value = coachSettings.coachingTone;
    
    const responseLengthSelect = document.getElementById('responseLength');
    if (responseLengthSelect) responseLengthSelect.value = coachSettings.responseLength;
    
    // Privacy
    const dataAnalyticsCheckbox = document.getElementById('dataAnalytics');
    if (dataAnalyticsCheckbox) dataAnalyticsCheckbox.checked = coachSettings.dataAnalytics;
    
    const personalizedInsightsCheckbox = document.getElementById('personalizedInsights');
    if (personalizedInsightsCheckbox) personalizedInsightsCheckbox.checked = coachSettings.personalizedInsights;
    
    // Session management
    const sessionReminderSelect = document.getElementById('sessionReminder');
    if (sessionReminderSelect) sessionReminderSelect.value = coachSettings.sessionReminder;
}

// Save settings
function saveSettings() {
    console.log('💾 Saving settings...');
    
    // Get values from form
    const autoSaveCheckbox = document.getElementById('autoSave');
    if (autoSaveCheckbox) coachSettings.autoSave = autoSaveCheckbox.checked;
    
    const typingIndicatorCheckbox = document.getElementById('typingIndicator');
    if (typingIndicatorCheckbox) coachSettings.typingIndicator = typingIndicatorCheckbox.checked;
    
    const soundNotificationsCheckbox = document.getElementById('soundNotifications');
    if (soundNotificationsCheckbox) coachSettings.soundNotifications = soundNotificationsCheckbox.checked;
    
    const coachingToneSelect = document.getElementById('coachingTone');
    if (coachingToneSelect) coachSettings.coachingTone = coachingToneSelect.value;
    
    const responseLengthSelect = document.getElementById('responseLength');
    if (responseLengthSelect) coachSettings.responseLength = responseLengthSelect.value;
    
    const dataAnalyticsCheckbox = document.getElementById('dataAnalytics');
    if (dataAnalyticsCheckbox) coachSettings.dataAnalytics = dataAnalyticsCheckbox.checked;
    
    const personalizedInsightsCheckbox = document.getElementById('personalizedInsights');
    if (personalizedInsightsCheckbox) coachSettings.personalizedInsights = personalizedInsightsCheckbox.checked;
    
    const sessionReminderSelect = document.getElementById('sessionReminder');
    if (sessionReminderSelect) coachSettings.sessionReminder = sessionReminderSelect.value;
    
    // Save to localStorage
    saveSettingsToStorage();
    
    // Close modal
    closeSettings();
    
    // Show confirmation
    showToast('Settings saved successfully!');
    
    console.log('✅ Settings saved:', coachSettings);
}

// Clear chat history
function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
        const chatContainer = findChatContainer();
        if (chatContainer) {
            // Keep only the welcome message
            const welcomeMessage = chatContainer.querySelector('.message-content');
            chatContainer.innerHTML = '';
            
            // Re-add welcome message
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'message-content';
            welcomeDiv.style.cssText = 'background: var(--surface); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; border-left: 3px solid var(--primary); max-width: 80%;';
            welcomeDiv.innerHTML = `
                <div style="color: var(--text-primary); line-height: 1.6; margin-bottom: 0.5rem;">
                    Welcome! I'm your AI Emotional Health Coach, specialized in helping entrepreneurs manage stress, build emotional intelligence, and achieve work-life balance. 
                    
                    How are you feeling today? What challenges would you like to work on?
                </div>
                <div style="color: var(--text-muted); font-size: 0.875rem;">Just now</div>
            `;
            chatContainer.appendChild(welcomeDiv);
        }
        
        // Clear from localStorage
        localStorage.removeItem('eeh_chat_history');
        
        showToast('Chat history cleared successfully!');
        console.log('🗑️ Chat history cleared');
    }
}

// UTILITY FUNCTIONS

// Save conversation to localStorage
function saveConversationToStorage() {
    const chatContainer = findChatContainer();
    if (chatContainer) {
        const messages = Array.from(chatContainer.querySelectorAll('.message')).map(msg => ({
            content: msg.querySelector('.message-content').textContent,
            type: msg.classList.contains('user-message') ? 'user' : 'ai',
            timestamp: msg.querySelector('.message-timestamp').textContent
        }));
        
        localStorage.setItem('eeh_chat_history', JSON.stringify(messages));
    }
}

// Play notification sound
function playNotificationSound() {
    try {
        // Create a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('🔇 Could not play notification sound:', error);
    }
}

// Show toast notification
function showToast(message) {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    // Add keyframes if not already added
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// EXISTING FUNCTIONS (for compatibility)

// Clear conversation function
function clearConversation() {
    clearChatHistory();
}

// Export chat function
function exportChat() {
    const chatContainer = findChatContainer();
    if (!chatContainer) {
        showToast('No chat history to export');
        return;
    }
    
    const messages = Array.from(chatContainer.querySelectorAll('.message')).map(msg => {
        const content = msg.querySelector('.message-content').textContent;
        const timestamp = msg.querySelector('.message-timestamp')?.textContent || '';
        const type = msg.classList.contains('user-message') ? 'You' : 'AI Coach';
        return `[${timestamp}] ${type}: ${content}`;
    }).join('\n\n');
    
    if (!messages) {
        showToast('No messages to export');
        return;
    }
    
    // Create and download file
    const blob = new Blob([messages], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eeh_chat_export_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Chat exported successfully!');
}

// Quick topic function
function quickTopic(topic) {
    const topicMessages = {
        stress: "I'm feeling stressed about work lately. Can you help me with some stress management techniques?",
        leadership: "I want to improve my leadership skills. What are some key areas I should focus on?",
        burnout: "I'm worried about burning out. How can I prevent burnout while still being productive?",
        communication: "I'm having communication issues with my team. Can you help me improve this?",
        decision: "I struggle with decision making under pressure. Can you give me some strategies?",
        confidence: "I want to build more confidence in my abilities. Where should I start?"
    };
    
    const message = topicMessages[topic] || `I'd like to discuss ${topic}`;
    const inputField = findInputField();
    if (inputField) {
        inputField.value = message;
        sendMessageNow();
    }
}

// Add goal function
function addGoal() {
    const goal = prompt('Enter your new goal:');
    if (goal && goal.trim()) {
        showToast('Goal added! (This feature will be enhanced in future updates)');
    }
}

// Track mood function
function trackMood(mood) {
    showToast(`Mood tracked: ${mood}`);
    console.log(`📊 Mood tracked: ${mood}`);
    
    // Save mood to localStorage for tracking
    const moodData = JSON.parse(localStorage.getItem('eeh_mood_tracking') || '[]');
    moodData.push({
        mood: mood,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
    });
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMoods = moodData.filter(entry => new Date(entry.timestamp) > thirtyDaysAgo);
    
    localStorage.setItem('eeh_mood_tracking', JSON.stringify(recentMoods));
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all stored data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('eeh_token');
        
        // Redirect to login
        window.location.href = 'login.html';
    }
}

console.log('✅ AI Coach script loaded with Render backend, token fixes, and working settings!');

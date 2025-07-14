// Complete Fixed AI Coach JavaScript - Backend URL + Token Fix + Working Settings

console.log('🚀 Starting EEH AI Coach...');

// Your Render backend URL
const BACKEND_URL = 'https://api.eehcommunity.com';

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

// Voice settings (API key will be handled securely on backend)
const VOICE_SETTINGS = {
    enabled: true,
    autoPlay: true
};

// Coach data
const COACHES = {
    coach1: {
        name: "Blair Reynolds",
        personality: "Humorous, empathy-oriented coach focused on transformative solutions",
        description: "Entrepreneurial enthusiasm with a focus on personal and relational health",
        avatar: "BR",
        status: "Ready",
        photoUrl: "https://raw.githubusercontent.com/blair307/ai-coach-app/main/images/blair.png",
        hasPhoto: true
    },
    coach2: {
        name: "Dave Charlson", 
        personality: "Warm, strategic coach focused on sustainable growth and well-being",
        description: "Balanced approach combining business success with personal fulfillment",
        avatar: "DC",
        status: "Ready",
        photoUrl: "https://raw.githubusercontent.com/blair307/ai-coach-app/main/images/dave.png",
        hasPhoto: true
    }
};

// Current selected coach
let selectedCoach = localStorage.getItem('selectedCoach') || null;


// Load coach photos
function loadCoachPhotos() {
    console.log('📸 Loading coach photos...');
    
    // Load Blair's photo
    const blairPhoto = document.getElementById('blairPhoto');
    const blairInitials = document.getElementById('blairInitials');
    
    if (COACHES.coach1.hasPhoto && COACHES.coach1.photoUrl && blairPhoto) {
        blairPhoto.src = COACHES.coach1.photoUrl;
        blairPhoto.onload = function() {
            blairPhoto.style.display = 'block';
            if (blairInitials) blairInitials.style.display = 'none';
            console.log('✅ Blair photo loaded');
        };
        blairPhoto.onerror = function() {
            console.log('⚠️ Blair photo failed to load, using initials');
            blairPhoto.style.display = 'none';
            if (blairInitials) blairInitials.style.display = 'flex';
        };
    }
    
    // Load Dave's photo
    const davePhoto = document.getElementById('davePhoto');
    const daveInitials = document.getElementById('daveInitials');
    
    if (COACHES.coach2.hasPhoto && COACHES.coach2.photoUrl && davePhoto) {
        davePhoto.src = COACHES.coach2.photoUrl;
        davePhoto.onload = function() {
            davePhoto.style.display = 'block';
            if (daveInitials) daveInitials.style.display = 'none';
            console.log('✅ Dave photo loaded');
        };
        davePhoto.onerror = function() {
            console.log('⚠️ Dave photo failed to load, using initials');
            davePhoto.style.display = 'none';
            if (daveInitials) daveInitials.style.display = 'flex';
        };
    }
}



document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Page loaded, setting up chat...');
    loadSettings();
    loadRecentInsights();
    loadCoachPhotos();
    checkCoachSelection();
    
    // Initialize new voice system
    initVoiceSystem();
    
    setTimeout(setupChat, 1000);
    
    // Load chat history AFTER everything else is set up
    setTimeout(loadChatHistory, 2000);
    
    // Refresh insights every 3 minutes
    setInterval(loadRecentInsights, 180000);
});

// Check if user has selected a coach
function checkCoachSelection() {
    console.log('🎯 Checking coach selection...');
    
    if (!selectedCoach) {
        console.log('📋 No coach selected, showing selector');
        showCoachSelector();
    } else {
        console.log('✅ Coach already selected:', selectedCoach);
        updateCoachDisplay();
        hideCoachSelector();
    }
}

// Show coach selector
function showCoachSelector() {
    const selector = document.getElementById('coachSelector');
    
    if (selector) {
        selector.style.display = 'block';
        console.log('👥 Coach selector shown');
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

// Hide coach selector
function hideCoachSelector() {
    const selector = document.getElementById('coachSelector');
    const switchBtn = document.getElementById('switchCoachBtn');
    
    if (selector) {
        selector.style.display = 'none';
    }
    
    if (switchBtn) {
        switchBtn.style.display = 'inline-flex';
    }
    
    // Re-enable body scroll
    document.body.style.overflow = '';
}

// Close coach selector function - ADD THIS NEW FUNCTION HERE
function closeCoachSelector() {
    const selector = document.getElementById('coachSelector');
    
    if (selector) {
        selector.style.display = 'none';
        console.log('👥 Coach selector closed by user');
    }
    
    // Re-enable body scroll if it was disabled
    document.body.style.overflow = '';
}

// Select a coach
async function selectCoach(coachId) {
    console.log('🎯 Selecting coach:', coachId);
    
    // Remove selected class from all cards
    document.querySelectorAll('.coach-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to chosen card
    const selectedCard = document.querySelector(`[data-coach="${coachId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Save selection locally first
    selectedCoach = coachId;
    localStorage.setItem('selectedCoach', coachId);
    
    // UPDATE THE DATABASE - WAIT FOR RESPONSE
    try {
        console.log('📡 Updating coach in database:', coachId);
        
        const response = await fetch(`${BACKEND_URL}/api/coaches/select`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                coachId: coachId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Coach updated in database successfully:', data);
            
            // Update display
            updateCoachDisplay();
            
            // Show confirmation and hide selector after delay
            setTimeout(() => {
                hideCoachSelector();
                showToast(`Great choice! You're now chatting with ${COACHES[coachId].name}`);
            }, 1000);
            
        } else {
            console.error('❌ Failed to update coach in database:', response.status);
            showToast('Error switching coaches. Please try again.');
        }
        
    } catch (error) {
        console.error('❌ Error updating coach in database:', error);
        showToast('Network error. Please check your connection.');
    }
}


// Update coach display in header
function updateCoachDisplay() {
    if (!selectedCoach || !COACHES[selectedCoach]) return;
    
    const coach = COACHES[selectedCoach];
    const avatarEl = document.getElementById('currentCoachAvatar');
    const nameEl = document.getElementById('currentCoachName');
    const statusEl = document.getElementById('currentCoachStatus');
    
    if (avatarEl) {
        if (coach.hasPhoto && coach.photoUrl) {
            // Use photo as background image
            avatarEl.style.backgroundImage = `url(${coach.photoUrl})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            // Use initials
            avatarEl.style.backgroundImage = 'none';
            avatarEl.textContent = coach.avatar;
        }
    }
    if (nameEl) nameEl.textContent = coach.name;
    if (statusEl) statusEl.textContent = coach.status;
    
    console.log('✅ Coach display updated:', coach.name);
}

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
        localStorage.getItem('authToken'),
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

 // Unlock mobile audio first
    if (!window.audioUnlocked && window.unlockMobileAudio) {
        unlockMobileAudio();
    }
    
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
    
    // Track coaching activity for dashboard
    localStorage.setItem('eeh_pending_coaching', JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionLength: 'medium'
    }));
    
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

    // Refresh insights after AI responses
    if (type === 'ai' && !isTemporary) {
        setTimeout(loadRecentInsights, 5000);
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

// ALWAYS unlock mobile audio before AI response
    if (!window.audioUnlocked && window.unlockMobileAudio) {
        console.log('📱 Unlocking mobile audio for AI response...');
        unlockMobileAudio();
    }
    
    try {
        // Check if coach is selected
        if (!selectedCoach) {
            removeThinkingMessage();
            addMessageToChat('Please select a coach first to start your conversation.', 'ai');
            showCoachSelector();
            return;
        }
        
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
        console.log('🎯 Using coach:', selectedCoach, COACHES[selectedCoach]?.name);
        
        // Include coaching style preferences and selected coach in the request
        const requestBody = {
            message: message,
            chatHistory: [],
            selectedCoach: selectedCoach,
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
// Clean the response for display (remove markdown formatting)
const cleanedDisplayResponse = data.response
    .replace(/\*\*/g, '') // Remove ** bold markers
    .replace(/\*/g, '')   // Remove * italic markers
    .replace(/#{1,6}\s/g, '') // Remove # headers
    .replace(/`([^`]+)`/g, '$1') // Remove single backticks, keep content
    .replace(/```[^`]*```/g, '') // Remove code blocks completely
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](link) to just text
    .trim();

addMessageToChat(cleanedDisplayResponse, 'ai');
         
    // Handle voice response with interruption support
if (data.audio && data.audio.url && voiceEnabled) {
    console.log('🎵 Playing voice response from:', data.audio.url.substring(0, 50) + '...');
    try {
        playAIAudio(data.audio.url);
    } catch (audioError) {
        console.log('❌ Audio creation failed:', audioError);
    }
}
            
        } else if (response.status === 401 || response.status === 403) {
         
            // Token is invalid/expired
            console.log('🔒 Authentication failed - token invalid or expired');
            
            // Try to get error details
            const errorData = await response.json().catch(() => ({}));
            console.log('❌ Auth error details:', errorData);
            
            // Clear all tokens and redirect to login
            localStorage.removeItem('authToken');
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

// Add coach selection to settings modal
function addCoachSelectionToSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    // Find the coaching style section
    const coachingStyleSection = modal.querySelector('div[style*="padding: 1.5rem 2rem; border-bottom: 1px solid #f1f5f9;"]:nth-child(3)');
    if (!coachingStyleSection) return;
    
    // Add coach selection HTML
    const coachSelectionHTML = `
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #374151;">Current coach:</label>
            <div style="display: flex; gap: 1rem; align-items: center; padding: 0.75rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #2696FE 0%, #1e7ed8 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                    ${selectedCoach ? COACHES[selectedCoach].avatar : 'AI'}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #374151;">${selectedCoach ? COACHES[selectedCoach].name : 'No coach selected'}</div>
                    <div style="font-size: 0.8rem; color: #6b7280;">${selectedCoach ? COACHES[selectedCoach].personality : 'Please select a coach'}</div>
                </div>
                <button onclick="showCoachSelector(); closeSettings();" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer;">
                    ${selectedCoach ? 'Switch Coach' : 'Select Coach'}
                </button>
            </div>
        </div>
    `;
    
    // Insert at the beginning of the coaching style section
    coachingStyleSection.insertAdjacentHTML('afterbegin', coachSelectionHTML);
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

// ==========================================
// INSIGHTS FUNCTIONALITY - FIXED SINGLE VERSION
// ==========================================

// Load real insights from backend - SINGLE VERSION
async function loadRecentInsights() {
  try {
    const token = getAuthToken();
    if (!token) {
        console.log('❌ No token for insights');
        return;
    }
    
    console.log('💡 Loading recent insights...');
    
    const response = await fetch(`${BACKEND_URL}/api/insights?limit=3`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const insights = await response.json();
      console.log('✅ Loaded insights:', insights.length);
      updateInsightsDisplay(insights);
    } else {
      console.log('❌ Failed to load insights:', response.status);
      // Show fallback insights
      updateInsightsDisplay([]);
    }
  } catch (error) {
    console.error('Error loading insights:', error);
    // Show fallback insights  
    updateInsightsDisplay([]);
  }
}

// Update the insights display with real data - SINGLE VERSION
function updateInsightsDisplay(insights) {
  const insightsContainer = document.querySelector('.insights-list');
  if (!insightsContainer) {
    console.log('❌ Insights container not found');
    return;
  }
  
  if (insights.length === 0) {
    insightsContainer.innerHTML = `
      <div class="insight-item">
        <p>Start chatting to generate personalized insights!</p>
        <small>No insights yet</small>
      </div>
    `;
    return;
  }
  
  insightsContainer.innerHTML = insights.map(insight => `
    <div class="insight-item" data-insight-id="${insight._id}">
      <p>"${insight.insight}"</p>
      <small>${formatTimeAgo(insight.createdAt)}</small>
      <div class="insight-actions" style="margin-top: 0.5rem;">
        <button onclick="markInsightAsRead('${insight._id}')" 
                style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: var(--primary-light); color: white; border: none; border-radius: 4px; cursor: pointer;">
          ${insight.isRead ? 'Read' : 'Mark Read'}
        </button>
      </div>
    </div>
  `).join('');
  
  console.log('✅ Updated insights display');
}

// Format time ago helper - SINGLE VERSION
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 48) return 'Yesterday';
  return `${Math.floor(diffInHours / 24)} days ago`;
}

// Mark insight as read - SINGLE VERSION
async function markInsightAsRead(insightId) {
  try {
    const token = getAuthToken();
    if (!token) return;
    
    const response = await fetch(`${BACKEND_URL}/api/insights/${insightId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      loadRecentInsights(); // Refresh the display
    }
  } catch (error) {
    console.error('Error marking insight as read:', error);
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
        localStorage.removeItem('authToken');
        
        // Redirect to login
        window.location.href = 'login.html';
    }
}

// =================================================================
// COMPLETE VOICE INPUT SYSTEM - FULL FEATURED FROM SCRATCH
// This replaces all existing voice functionality
// =================================================================

// Voice system variables - CLEAN START
let voiceRecognition = null;
let isCurrentlyListening = false;
let voiceSupported = false;
let voiceTimeout = null;
let completeTranscript = '';
let currentAudio = null; // Track AI voice playback for interruption

// Initialize complete voice system
function initVoiceSystem() {
    console.log('Initializing complete voice system...');
    
    // Check browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        
        // Configure for best results
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';
        voiceRecognition.maxAlternatives = 1;
        
        // Handle speech results
        voiceRecognition.onresult = handleVoiceResults;
        voiceRecognition.onerror = handleVoiceError;
        voiceRecognition.onstart = handleVoiceStart;
        voiceRecognition.onend = handleVoiceEnd;
        
        voiceSupported = true;
        console.log('✅ Voice recognition system ready');
    } else {
        console.log('❌ Voice recognition not supported');
        voiceSupported = false;
    }
    
    // Create the voice button
    createVoiceButton();
}

// Handle speech recognition results
function handleVoiceResults(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    
    // Process ALL results from the beginning, not just new ones
    for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }
    
    // Update our complete transcript with all final results
    if (finalTranscript && finalTranscript !== completeTranscript) {
        completeTranscript = finalTranscript;
        console.log('🎤 Updated complete transcript:', completeTranscript);
        
        // Reset the 3-second auto-send timer
        resetAutoSendTimer();
    }
    
    // Update input field with complete final + current interim text
    const inputField = findInputField();
    if (inputField) {
        inputField.value = completeTranscript + interimTranscript;
    }
}

// Reset the 3-second auto-send timer
function resetAutoSendTimer() {
    // Clear existing timer
    if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        voiceTimeout = null;
    }
    
    // Set new 3-second timer
    voiceTimeout = setTimeout(() => {
        console.log('⏰ 3 seconds of silence - auto-sending');
        finishVoiceInput();
    }, 3000);
}

// Handle voice recognition errors
function handleVoiceError(event) {
    console.error('🎤 Voice error:', event.error);
    
    let errorMessage = 'Voice input error. Please try again.';
    switch(event.error) {
        case 'no-speech':
            errorMessage = 'No speech detected. Please speak louder.';
            break;
        case 'audio-capture':
            errorMessage = 'Microphone not available.';
            break;
        case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
        case 'network':
            errorMessage = 'Network error. Check your connection.';
            break;
    }
    
    showToast(errorMessage);
    stopVoiceInput();
}

// Handle voice recognition start
function handleVoiceStart() {
    console.log('🎤 Voice recognition started');
    const inputField = findInputField();
    if (inputField) {
        inputField.placeholder = '🎤 Listening... speak now!';
    }
}

// Handle voice recognition end
function handleVoiceEnd() {
    if (isCurrentlyListening) {
        // Restart recognition to keep listening
        try {
            setTimeout(() => {
                if (isCurrentlyListening && voiceRecognition) {
                    voiceRecognition.start();
                }
            }, 100);
        } catch (error) {
            console.log('Could not restart recognition');
            stopVoiceInput();
        }
    }
}

// Create the beautiful voice input button
function createVoiceButton() {
    const inputActions = document.querySelector('.input-actions');
    if (!inputActions) {
        console.log('❌ Cannot find input actions container');
        return;
    }
    
    // Remove any existing voice button
    const existingBtn = document.getElementById('voiceInputBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Create new voice button
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voiceInputBtn';
    voiceButton.className = 'btn btn-outline voice-input-btn';
    voiceButton.setAttribute('aria-label', 'Voice input');
    voiceButton.innerHTML = `
        <svg class="voice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <span class="voice-btn-text">Speak</span>
    `;
    
    // Add click handler
    voiceButton.onclick = toggleVoiceInput;
    
    // Add keyboard shortcut hint
    voiceButton.title = 'Click to speak, or use Ctrl+Space';
    
    // Insert before send button
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        inputActions.insertBefore(voiceButton, sendButton);
    } else {
        inputActions.appendChild(voiceButton);
    }
    
    // Hide if not supported
    if (!voiceSupported) {
        voiceButton.style.display = 'none';
    }
    
    console.log('✅ Voice button created');
}

// Toggle voice input on/off
function toggleVoiceInput() {
    if (!voiceSupported) {
        showToast('Voice input not available in this browser');
        return;
    }
    
    // INTERRUPT AI AUDIO if it's playing
    stopAIAudio();
    
    if (isCurrentlyListening) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

// Start voice input
function startVoiceInput() {
    if (!voiceRecognition || isCurrentlyListening) {
        return;
    }
    
    try {
        // Reset everything
        completeTranscript = '';
        clearTimeout(voiceTimeout);
        voiceTimeout = null;
        
        // Clear input field
        const inputField = findInputField();
        if (inputField) {
            inputField.value = '';
            inputField.placeholder = 'Listening... speak now';
            inputField.focus();
        }
        
        // Start recognition
        voiceRecognition.start();
        isCurrentlyListening = true;
        
        // Update button appearance
        updateVoiceButtonState(true);
        
        console.log('🎤 Voice input started');
        showToast('🎤 Listening... speak now!');
        
    } catch (error) {
        console.error('Error starting voice input:', error);
        showToast('Could not start voice input');
        stopVoiceInput();
    }
}

// Stop voice input
function stopVoiceInput() {
    if (!voiceRecognition) return;
    
    try {
        voiceRecognition.stop();
    } catch (error) {
        console.log('Recognition already stopped');
    }
    
    isCurrentlyListening = false;
    
    // Clear timeout
    if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        voiceTimeout = null;
    }
    
    // Update button appearance
    updateVoiceButtonState(false);
    
    // Restore placeholder
    const inputField = findInputField();
    if (inputField) {
        inputField.placeholder = 'Share what\'s on your mind...';
    }
    
    console.log('🔇 Voice input stopped');
}

// Finish voice input and send message
function finishVoiceInput() {
    const inputField = findInputField();
    
    if (inputField && completeTranscript.trim().length > 0) {
        // Ensure the input has the final transcript
        inputField.value = completeTranscript.trim();
        
        // Stop voice input first
        stopVoiceInput();
        
        // Clear the transcript to prevent double-sending
        const messageToSend = completeTranscript.trim();
        completeTranscript = '';
        
        // Use the EXACT SAME function as Send Message button
        setTimeout(() => {
            if (inputField.value.trim() === messageToSend) {
                sendMessageNow(); // Same function Send Message uses
                console.log('📤 Voice message sent via sendMessageNow');
            }
        }, 200);
        
    } else {
        // No text to send, just stop
        stopVoiceInput();
    }
}

// Update voice button visual state
function updateVoiceButtonState(listening) {
    const voiceButton = document.getElementById('voiceInputBtn');
    if (!voiceButton) return;
    
    const icon = voiceButton.querySelector('.voice-icon');
    const text = voiceButton.querySelector('.voice-btn-text');
    
    if (listening) {
        // Listening state - red and pulsing
        voiceButton.classList.add('listening');
        voiceButton.classList.remove('btn-outline');
        voiceButton.classList.add('btn-primary');
        voiceButton.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        voiceButton.style.borderColor = '#ef4444';
        voiceButton.style.color = 'white';
        voiceButton.setAttribute('aria-pressed', 'true');
        
        if (text) text.textContent = 'Stop';
        
        // Update icon to recording state
        if (icon) {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" stroke="currentColor" fill="none"/>
            `;
        }
    } else {
        // Not listening state - normal
        voiceButton.classList.remove('listening');
        voiceButton.classList.add('btn-outline');
        voiceButton.classList.remove('btn-primary');
        voiceButton.style.background = '';
        voiceButton.style.borderColor = '';
        voiceButton.style.color = '';
        voiceButton.setAttribute('aria-pressed', 'false');
        
        if (text) text.textContent = 'Speak';
        
        // Restore microphone icon
        if (icon) {
            icon.innerHTML = `
                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            `;
        }
    }
}

// Stop any currently playing AI audio (for interruption)
function stopAIAudio() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
            console.log('🔇 Interrupted AI audio playback');
        } catch (error) {
            console.log('Could not stop audio:', error);
        }
    }
}

// Enhanced audio playback with tracking (modify your existing callAI function)
function playAIAudio(audioUrl) {
    try {
        // Stop any existing audio first
        stopAIAudio();
        
        // Create and play new audio
        currentAudio = new Audio(audioUrl);
        currentAudio.play()
            .then(() => {
                console.log('🎵 AI audio playing');
            })
            .catch(error => {
                console.log('❌ Audio playback failed:', error);
                currentAudio = null;
            });
            
        // Clear reference when done
        currentAudio.onended = () => {
            currentAudio = null;
        };
        
    } catch (error) {
        console.log('❌ Audio creation failed:', error);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+Space to toggle voice input
    if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        toggleVoiceInput();
    }
    
    // Escape to stop voice input
    if (event.code === 'Escape' && isCurrentlyListening) {
        event.preventDefault();
        stopVoiceInput();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    stopVoiceInput();
    stopAIAudio();
});

// Initialize the voice system
console.log('🎤 Voice system module loaded');

// Export for global access
window.voiceSystem = {
    start: startVoiceInput,
    stop: stopVoiceInput,
    toggle: toggleVoiceInput,
    isListening: () => isCurrentlyListening,
    isSupported: () => voiceSupported,
    stopAudio: stopAIAudio
};

console.log('✅ AI Coach script loaded with Render backend, token fixes, working settings, and coach selection!');

// Initialize coach selection on page load
window.addEventListener('load', function() {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        if (selectedCoach) {
            updateCoachDisplay();
        }
    }, 500);
});

// Load chat history when page loads
async function loadChatHistory() {
    try {
        const token = getAuthToken();
        if (!token) {
            console.log('❌ No token for chat history');
            return;
        }
        
        console.log('📜 Loading chat history...');
        
        const response = await fetch(`${BACKEND_URL}/api/chat/history`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Loaded ${data.messages?.length || 0} chat messages`);
            
            // Display the messages in the chat
            if (data.messages && data.messages.length > 0) {
                displayChatHistory(data.messages);
            }
        } else {
            console.log('❌ Failed to load chat history:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading chat history:', error);
    }
}

// Display chat messages
function displayChatHistory(messages) {
    const chatContainer = findChatContainer();
    if (!chatContainer) return;
    
    // Keep welcome message, just add history after it
    messages.forEach(message => {
        addMessageToChat(message.content, message.role === 'user' ? 'user' : 'ai', false);
    });
    
    console.log('✅ Chat history displayed');
}

// Voice toggle functionality - ADD THIS HERE
let voiceEnabled = true;

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const voiceBtn = document.getElementById('voiceToggleBtn');
    
    if (voiceEnabled) {
        voiceBtn.textContent = 'Voice On';
        voiceBtn.classList.remove('btn-secondary');
        voiceBtn.classList.add('btn-outline');
        showToast('Voice responses enabled');
    } else {
        voiceBtn.textContent = 'Voice Off';
        voiceBtn.classList.remove('btn-outline');
        voiceBtn.classList.add('btn-secondary');
        showToast('Voice responses disabled');
    }
    
    console.log('🎵 Voice toggle:', voiceEnabled ? 'ON' : 'OFF');
}

// Force button spacing with JavaScript
function fixButtonSpacing() {
    const inputActions = document.querySelector('.input-actions');
    const voiceBtn = document.getElementById('voiceInputBtn');
    const sendBtn = document.getElementById('sendButton');
    
    if (inputActions && voiceBtn && sendBtn) {
        // Force styles with JavaScript
        inputActions.style.cssText = `
            display: flex !important;
            gap: 2rem !important;
            justify-content: center !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            padding-top: 1rem !important;
        `;
        
        voiceBtn.style.cssText += `
            min-width: 140px !important;
            margin: 0 1rem !important;
            flex: 0 0 auto !important;
        `;
        
        sendBtn.style.cssText += `
            min-width: 140px !important;
            margin: 0 1rem !important;
            flex: 0 0 auto !important;
        `;
        
        console.log('✅ Button spacing fixed with JavaScript');
    }
}

// Run the fix when page loads and after voice button is created
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(fixButtonSpacing, 1500);
});

// Also run after voice system initializes
setTimeout(fixButtonSpacing, 2000);

// Fix voice button state updates
function fixVoiceButtonUpdates() {
    if (!window.updateVoiceButtonState) return;
    
    // Enhanced button update function
    const originalUpdate = window.updateVoiceButtonState;
    window.updateVoiceButtonState = function(listening) {
        originalUpdate(listening);
        console.log('🎤 Button updated to:', listening ? 'LISTENING' : 'STOPPED');
    };
}

// Call the fix when page loads
setTimeout(fixVoiceButtonUpdates, 2000);

// Mobile Audio Fix - Add this to the bottom of ai-coach.js
let audioUnlocked = false;

function unlockMobileAudio() {
    if (audioUnlocked) return;
    
    // Play silent audio to unlock mobile audio context
    const silentAudio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
    
    silentAudio.play().then(() => {
        console.log('📱 Mobile audio unlocked');
        audioUnlocked = true;
    }).catch(e => {
        console.log('Audio unlock attempt failed:', e);
    });
}

// Add event listeners to unlock audio on first user interaction
document.addEventListener('click', unlockMobileAudio, { once: true });
document.addEventListener('touchstart', unlockMobileAudio, { once: true });

// Also unlock when send button is clicked
setTimeout(() => {
    const sendBtn = document.getElementById('sendButton');
    if (sendBtn) {
        sendBtn.addEventListener('click', unlockMobileAudio);
    }
}, 1000);

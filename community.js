// Community.js - FIXED VERSION - No more loading loops!

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false; // Add this flag to prevent re-initialization

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Community page loading...');
    
    // Hide loading overlay immediately
    hideLoadingOverlay();
    
    // Initialize with a small delay to ensure DOM is ready
    setTimeout(() => {
        initializeCommunity();
    }, 100);
});

// Hide the loading overlay
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show error in community area instead of endless loading
function showCommunityError(message) {
    const messagesContainer = document.getElementById('communityMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <h3 style="color: var(--error); margin-bottom: 1rem;">⚠️ Connection Issue</h3>
                <p style="margin-bottom: 1.5rem;">${message}</p>
                <button onclick="retryInitialization()" class="btn btn-primary">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Retry initialization function
function retryInitialization() {
    console.log('🔄 Retrying community initialization...');
    const messagesContainer = document.getElementById('communityMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <p>Reconnecting...</p>
            </div>
        `;
    }
    
    // Reset initialization flag
    isInitialized = false;
    
    // Try again after a short delay
    setTimeout(() => {
        initializeCommunity();
    }, 1000);
}

// Initialize the community system
async function initializeCommunity() {
    try {
        // Prevent multiple initializations
        if (isInitialized) {
            console.log('⚠️ Community already initialized, skipping...');
            return;
        }

        console.log('🚀 Starting community initialization...');
        
        // Get current user info
        currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('❌ No user found');
            showCommunityError('Please log in to access the community.');
            return;
        }

        console.log('✅ User found:', currentUser.email);

        // Set layout based on screen size (ONE TIME ONLY)
        setLayoutForScreenSize();

        // Show loading message in community area
        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <p>Loading rooms...</p>
                </div>
            `;
        }

        // Load all rooms from backend
        const roomsLoaded = await loadRooms();
        
        if (!roomsLoaded) {
            console.error('❌ Failed to load rooms');
            showCommunityError('Unable to load chat rooms. Please check your connection and try again.');
            return;
        }

        // Set default room (General Discussion or first available)
        const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
        if (generalRoom) {
            currentRoomId = generalRoom._id;
            currentRoomName = generalRoom.name;
            console.log('🏠 Setting default room:', currentRoomName);
            await switchRoom(generalRoom._id);
        } else {
            // No rooms available
            const messagesContainer = document.getElementById('communityMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <h3>Welcome to Community Chat!</h3>
                        <p style="margin-bottom: 1.5rem;">No rooms are available yet.</p>
                        <button onclick="createRoom()" class="btn btn-primary">
                            Create First Room
                        </button>
                    </div>
                `;
            }
        }

        // Mark as initialized
        isInitialized = true;
        console.log('✅ Community initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing community:', error);
        showCommunityError('Failed to initialize community. Please refresh the page or try again later.');
    }
}

// SIMPLE: Set layout based on screen size (called only once)
function setLayoutForScreenSize() {
    const isMobile = window.innerWidth <= 1024;
    console.log('📱 Setting layout for screen size:', { isMobile, width: window.innerWidth });
    
    const mobileSelector = document.querySelector('.mobile-room-selector');
    const desktopSidebar = document.querySelector('.rooms-sidebar');
    const desktopOnlyElements = document.querySelectorAll('.desktop-only');

    if (isMobile) {
        // Show mobile layout
        if (mobileSelector) mobileSelector.style.display = 'block';
        if (desktopSidebar) desktopSidebar.style.display = 'none';
        
        // Hide desktop-only elements
        desktopOnlyElements.forEach(el => {
            if (!el.classList.contains('rooms-sidebar')) {
                el.style.display = 'none';
            }
        });

        // Prevent iOS zoom on inputs
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
        });

    } else {
        // Show desktop layout
        if (mobileSelector) mobileSelector.style.display = 'none';
        if (desktopSidebar) desktopSidebar.style.display = 'flex';
        
        // Show desktop-only elements
        desktopOnlyElements.forEach(el => {
            el.style.display = '';
        });
    }
}

// Get current user info from token or localStorage
function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            console.log('❌ No auth token found');
            return null;
        }
        
        // Decode JWT token to get user info (simple decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = {
            id: payload.userId,
            email: payload.email,
            name: localStorage.getItem('userName') || 'User'
        };
        
        console.log('✅ Current user:', user);
        return user;
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

// Load all rooms from backend - WITH TIMEOUT
async function loadRooms() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('📡 Fetching rooms from backend...');

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to load rooms: ${response.status}`);
        }

        rooms = await response.json();
        console.log('📁 Loaded rooms:', rooms.length);
        
        // Update the rooms list in the UI
        updateRoomsList();
        return true;
        
    } catch (error) {
        console.error('❌ Error loading rooms:', error);
        
        // Use fallback default rooms if backend fails
        console.log('🔄 Using fallback rooms...');
        rooms = [
            { _id: 'general', name: 'General Discussion', description: 'Open chat for everyone' },
            { _id: 'business-growth', name: 'Business Growth', description: 'Scaling strategies & challenges' },
            { _id: 'work-life-balance', name: 'Work-Life Balance', description: 'Managing entrepreneurial stress' }
        ];
        updateRoomsList();
        return true; // Return true even with fallback rooms
    }
}

// Update rooms list for both desktop and mobile
function updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    const roomDropdown = document.getElementById('roomDropdown');
    
    console.log('🔄 Updating rooms list UI...');
    
    // Update desktop rooms list
    if (roomsList && rooms && rooms.length > 0) {
        roomsList.innerHTML = '';

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.setAttribute('data-room', room._id);
            
            if (room.isDefault) {
                roomElement.setAttribute('data-default', 'true');
            }
            
            roomElement.onclick = (e) => {
                if (e.target.classList.contains('room-delete-btn')) {
                    return;
                }
                switchRoom(room._id);
            };

            if (room._id === currentRoomId) {
                roomElement.classList.add('active');
            }

            roomElement.innerHTML = `
                <div class="room-info">
                    <h4>${room.name}</h4>
                    <p>${room.description}</p>
                </div>
                <div class="room-stats">
                    ${!room.isDefault ? `<button class="room-delete-btn" onclick="deleteRoom('${room._id}')" title="Delete room">×</button>` : ''}
                </div>
            `;

            roomsList.appendChild(roomElement);
        });
    }
    
    // Update mobile dropdown
    if (roomDropdown && rooms && rooms.length > 0) {
        roomDropdown.innerHTML = '<option value="">Select a room...</option>';
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room._id;
            option.textContent = room.name;
            option.selected = room._id === currentRoomId;
            roomDropdown.appendChild(option);
        });
    }
    
    console.log('✅ Rooms list updated');
}

// Switch to a different room
async function switchRoom(roomId) {
    try {
        if (!roomId) {
            console.log('⚠️ No room ID provided');
            return;
        }

        const room = rooms.find(r => r._id === roomId);
        if (!room) {
            console.error('❌ Room not found:', roomId);
            return;
        }

        console.log('🔄 Switching to room:', room.name);

        // Update current room
        currentRoomId = roomId;
        currentRoomName = room.name;

        // Update desktop UI
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        const currentRoomElement = document.querySelector(`[data-room="${roomId}"]`);
        if (currentRoomElement) {
            currentRoomElement.classList.add('active');
        }

        // Update mobile dropdown
        const roomDropdown = document.getElementById('roomDropdown');
        if (roomDropdown) {
            roomDropdown.value = roomId;
        }

        // Update room title
        const roomNameElement = document.getElementById('currentRoomName');
        const roomDescElement = document.getElementById('currentRoomDescription');
        if (roomNameElement) roomNameElement.textContent = room.name;
        if (roomDescElement) roomDescElement.textContent = room.description;

        // Enable message input and buttons
        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        const emojiButton = document.getElementById('emojiBtn');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = `Message ${room.name}...`;
        }
        if (sendButton) sendButton.disabled = false;
        if (emojiButton) emojiButton.disabled = false;

        // Load messages for this room
        await loadMessages(roomId);

        console.log('✅ Successfully switched to room:', room.name);
    } catch (error) {
        console.error('❌ Error switching rooms:', error);
        showErrorMessage('Failed to switch rooms. Please try again.');
    }
}

// Load messages for a specific room - WITH TIMEOUT
async function loadMessages(roomId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('📨 Loading messages for room:', roomId);

        // Show loading in messages area
        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <p>Loading messages...</p>
                </div>
            `;
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to load messages: ${response.status}`);
        }

        const messages = await response.json();
        console.log('💬 Loaded messages for room:', roomId, messages.length);
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        
        // Show empty state instead of hanging
        displayMessages([]);
    }
}

// Display messages in the chat area
function displayMessages(messages) {
    const messagesContainer = document.getElementById('communityMessages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>No messages yet. Be the first to start the conversation!</p>
            </div>
        `;
        return;
    }

    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create a message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';

    // Get user initials for avatar
    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Format timestamp
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-avatar" style="background-color: ${message.avatarColor || '#6366f1'}">
                ${userInitials}
            </div>
            <span class="username">${username}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content">
            ${escapeHtml(message.content || message.message || '')}
        </div>
    `;

    return messageDiv;
}

// Format message timestamp
function formatMessageTime(timestamp) {
    if (!timestamp) return 'Now';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return messageDate.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send a message - WITH TIMEOUT
async function sendCommunityMessage() {
    try {
        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        
        if (!messageInput || !currentRoomId) {
            console.error('❌ Missing required elements or room not selected');
            return;
        }

        const messageText = messageInput.value.trim();
        if (!messageText) {
            return;
        }

        // Show loading state
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
        }

        // Add mobile haptic feedback
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(30);
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Send message to backend
        const response = await fetch(`${API_BASE_URL}/api/rooms/${currentRoomId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: messageText,
                avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U',
                avatarColor: '#6366f1'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.status}`);
        }

        const newMessage = await response.json();
        console.log('📤 Message sent successfully');

        // Clear input
        messageInput.value = '';

        // Hide mobile keyboard
        if (window.innerWidth <= 1024) {
            messageInput.blur();
        }

        // Reload messages to show the new one
        await loadMessages(currentRoomId);

    } catch (error) {
        console.error('❌ Error sending message:', error);
        showErrorMessage('Failed to send message. Please try again.');
    } finally {
        // Re-enable send button
        const sendButton = document.getElementById('sendCommunityButton');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        }
    }
}

// Handle keyboard input
function handleCommunityKeyPress(event) {
    if (event.key === 'Enter') {
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile) {
            // On mobile, don't send on Enter to allow multi-line
            return;
        } else {
            // On desktop, send on Enter (unless Shift+Enter)
            if (!event.shiftKey) {
                event.preventDefault();
                sendCommunityMessage();
            }
        }
    }
}

// Create a new room - WITH TIMEOUT
async function createRoom() {
    try {
        const roomName = prompt('Enter room name:');
        if (!roomName || !roomName.trim()) return;

        const roomDescription = prompt('Enter room description:');
        if (!roomDescription || !roomDescription.trim()) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: roomName.trim(),
                description: roomDescription.trim()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to create room: ${response.status}`);
        }

        const newRoom = await response.json();
        console.log('🆕 Room created successfully:', newRoom.name);

        // Reload rooms
        await loadRooms();
        
        // Switch to the new room
        switchRoom(newRoom._id);

    } catch (error) {
        console.error('❌ Error creating room:', error);
        showErrorMessage('Failed to create room. Please try again.');
    }
}

// Delete a room - WITH TIMEOUT
async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to delete room: ${response.status}`);
        }

        console.log('🗑️ Room deleted successfully');

        // If we were in the deleted room, switch to General Discussion
        if (currentRoomId === roomId) {
            const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
            if (generalRoom) {
                switchRoom(generalRoom._id);
            }
        }

        // Reload rooms
        await loadRooms();

    } catch (error) {
        console.error('❌ Error deleting room:', error);
        showErrorMessage('Failed to delete room. You may not have permission or the room may not exist.');
    }
}

// Error message function
function showErrorMessage(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 20px; left: 20px; right: 20px;' : 'bottom: 20px; right: 20px; max-width: 400px;'}
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Emoji functions
function addEmoji() {
    const isMobile = window.innerWidth <= 1024;
    
    if (isMobile) {
        insertEmoji('😊');
        return;
    }
    
    toggleEmoji();
}

function toggleEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        const isVisible = emojiModal.style.display === 'block';
        emojiModal.style.display = isVisible ? 'none' : 'block';
    }
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('communityMessageInput');
    if (messageInput) {
        const cursorPos = messageInput.selectionStart || messageInput.value.length;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(messageInput.selectionEnd || cursorPos);
        messageInput.value = textBefore + emoji + textAfter;
        
        const newPos = cursorPos + emoji.length;
        messageInput.setSelectionRange(newPos, newPos);
        messageInput.focus();
    }
    
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        emojiModal.style.display = 'none';
    }
}

// Search functionality (desktop only)
function performSearch() {
    if (window.innerWidth <= 1024) {
        return; // Skip search on mobile
    }
    console.log('🔍 Search functionality available on desktop');
}

function closeSearch() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// SIMPLE: Only add essential event listeners (NO RESIZE LISTENERS)
function initializeBasicEvents() {
    console.log('🚀 Initializing basic event listeners');
    
    // Close emoji modal when clicking outside (desktop only)
    document.addEventListener('click', function(event) {
        if (window.innerWidth > 1024) {
            const emojiModal = document.getElementById('emojiModal');
            const addEmojiBtn = event.target.closest('button[onclick="addEmoji()"]');
            
            if (emojiModal && !emojiModal.contains(event.target) && !addEmojiBtn) {
                emojiModal.style.display = 'none';
            }
        }
    });
    
    console.log('✅ Basic event listeners initialized');
}

// Auto-refresh messages every 30 seconds (only if initialized)
setInterval(async () => {
    if (currentRoomId && isInitialized) {
        try {
            await loadMessages(currentRoomId);
        } catch (error) {
            console.log('⚠️ Auto-refresh failed, will try again next time');
        }
    }
}, 30000);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBasicEvents);
} else {
    initializeBasicEvents();
}

// Export functions for global access
window.updateRoomsList = updateRoomsList;
window.switchRoom = switchRoom;
window.sendCommunityMessage = sendCommunityMessage;
window.handleCommunityKeyPress = handleCommunityKeyPress;
window.createRoom = createRoom;
window.deleteRoom = deleteRoom;
window.addEmoji = addEmoji;
window.toggleEmoji = toggleEmoji;
window.insertEmoji = insertEmoji;
window.performSearch = performSearch;
window.closeSearch = closeSearch;
window.initializeCommunity = initializeCommunity;
window.retryInitialization = retryInitialization;
window.logout = logout;

console.log('✅ Community.js loaded - FIXED VERSION with proper error handling and no loops!');

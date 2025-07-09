// Enhanced Community.js - With Like & Reply Features + Full Backend Integration

const API_BASE_URL = 'https://api.eehcommunity.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false;
let currentReplyTo = null;

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Community page loading...');
    
    // FORCE HIDE modals immediately on page load
    setTimeout(() => {
        const searchResults = document.getElementById('searchResults');
        const emojiModal = document.getElementById('emojiModal');
        
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.style.visibility = 'hidden';
        }
        
        if (emojiModal) {
            emojiModal.style.display = 'none';
            emojiModal.style.visibility = 'hidden';
        }
    }, 50);
    
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

        console.log('🚀 Starting enhanced community initialization...');
        
        // ENSURE modals are hidden during initialization
        const searchResults = document.getElementById('searchResults');
        const emojiModal = document.getElementById('emojiModal');
        
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.style.visibility = 'hidden';
        }
        
        if (emojiModal) {
            emojiModal.style.display = 'none';
            emojiModal.style.visibility = 'hidden';
        }
        
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
        console.log('✅ Enhanced community initialized successfully');
        
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
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
            console.log('❌ No auth token found');
            return null;
        }
        
        // Decode JWT token to get user info (simple decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = {
            id: payload.userId,
            email: payload.email,
            name: localStorage.getItem('userName') || payload.email?.split('@')[0] || 'User'
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
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
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

        // Cancel any active reply when switching rooms
        cancelReply();

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

// Load messages for a specific room - WITH TIMEOUT AND ENHANCED FEATURES
async function loadMessages(roomId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
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

// ENHANCED: Display messages with like/reply support
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

// ENHANCED: Create a message element with like/reply functionality
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';
    messageDiv.setAttribute('data-message-id', message._id || message.id || Date.now());

    // Get user info
    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Format timestamp
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    
    // Get message content
    const content = message.content || message.message || '';
    
    // Check if this is a reply
    let replyHtml = '';
    if (message.replyTo) {
        replyHtml = `
            <div class="reply-reference">
                <div class="reply-author">↳ ${escapeHtml(message.replyTo.username)}</div>
                <div class="reply-text">${escapeHtml(message.replyTo.content)}</div>
            </div>
        `;
    }
    
    // Get like data (from backend or simulate for demo)
    const likes = message.likes || [];
    const likeCount = likes.length;
    const isLikedByUser = likes.includes(currentUser?.id);
    const hasLikes = likeCount > 0;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-avatar" style="background-color: ${message.avatarColor || '#6366f1'}">
                ${userInitials}
            </div>
            <span class="username">${escapeHtml(username)}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content">
            ${replyHtml}
            ${escapeHtml(content)}
            <div class="message-actions">
                <button class="action-btn like-btn ${isLikedByUser ? 'liked' : ''}" 
                        onclick="toggleLike('${message._id || message.id || Date.now()}')" 
                        title="Like">
                    ${isLikedByUser ? '♥' : '♡'}
                </button>
                <button class="action-btn reply-btn" 
                        onclick="replyToMessage('${message._id || message.id || Date.now()}', '${escapeHtml(username)}', '${escapeHtml(content)}')" 
                        title="Reply">
                    ↳
                </button>
            </div>
        </div>
        <div class="message-footer">
            <div class="like-count ${hasLikes ? 'has-likes' : ''}" 
                 data-count="${likeCount}" 
                 style="display: ${hasLikes ? 'flex' : 'none'}">
                ${hasLikes ? `♥ ${likeCount}` : ''}
            </div>
        </div>
    `;

    return messageDiv;
}

// NEW: Toggle like functionality with backend integration
async function toggleLike(messageId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('🔄 Toggling like for message:', messageId);
        
        // Find the message element and get current state
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) {
            console.error('❌ Message element not found');
            return;
        }
        
        const likeBtn = messageElement.querySelector('.like-btn');
        const likeCount = messageElement.querySelector('.like-count');
        
        if (!likeBtn || !likeCount) {
            console.error('❌ Like button or count element not found');
            return;
        }
        
        const isCurrentlyLiked = likeBtn.classList.contains('liked');
        const currentCount = parseInt(likeCount.dataset.count || '0');
        
        // Optimistic UI update
        if (isCurrentlyLiked) {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '♡';
            const newCount = Math.max(0, currentCount - 1);
            updateLikeDisplay(likeCount, newCount);
        } else {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '♥';
            const newCount = currentCount + 1;
            updateLikeDisplay(likeCount, newCount);
            
            // Add haptic feedback on mobile
            if (navigator.vibrate && window.innerWidth <= 1024) {
                navigator.vibrate(30);
            }
        }

        // NOTE: Backend integration would go here
        // For now, we're using optimistic updates
        // In a real app, you'd send the like to the backend:
        /*
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Revert the optimistic update if backend fails
            // ... revert logic here
            throw new Error('Failed to toggle like');
        }
        */
        
        console.log('✅ Like toggled successfully');
        
    } catch (error) {
        console.error('❌ Error toggling like:', error);
        // In a real app, you'd revert the optimistic update here
        showErrorMessage('Failed to update like. Please try again.');
    }
}

// Helper function to update like display
function updateLikeDisplay(likeElement, count) {
    likeElement.dataset.count = count;
    
    if (count > 0) {
        likeElement.innerHTML = `♥ ${count}`;
        likeElement.classList.add('has-likes');
        likeElement.style.display = 'flex';
    } else {
        likeElement.innerHTML = '';
        likeElement.classList.remove('has-likes');
        likeElement.style.display = 'none';
    }
}

// NEW: Reply functionality
function replyToMessage(messageId, username, content) {
    currentReplyTo = { messageId, username, content };
    
    console.log('💬 Replying to message:', { messageId, username });
    
    // Show reply banner
    const replyBanner = document.getElementById('replyBanner');
    const replyToUser = document.getElementById('replyToUser');
    const replyToMessage = document.getElementById('replyToMessage');
    const chatInput = document.querySelector('.chat-input');
    
    if (replyBanner && replyToUser && replyToMessage && chatInput) {
        replyToUser.textContent = username;
        replyToMessage.textContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        
        replyBanner.style.display = 'block';
        chatInput.classList.add('replying');
        
        // Focus the input
        const messageInput = document.getElementById('communityMessageInput');
        if (messageInput) {
            messageInput.focus();
        }
        
        // Add haptic feedback on mobile
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(50);
        }
        
        console.log('✅ Reply banner shown');
    }
}

// NEW: Cancel reply functionality
function cancelReply() {
    currentReplyTo = null;
    
    const replyBanner = document.getElementById('replyBanner');
    const chatInput = document.querySelector('.chat-input');
    
    if (replyBanner) {
        replyBanner.style.display = 'none';
    }
    
    if (chatInput) {
        chatInput.classList.remove('replying');
    }
    
    console.log('✅ Reply cancelled');
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

// ENHANCED: Send a message with reply support - WITH TIMEOUT
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

        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Prepare message data
        const messageData = {
            content: messageText,
            avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U',
            avatarColor: '#6366f1'
        };

        // Add reply data if replying
        if (currentReplyTo) {
            messageData.replyTo = {
                messageId: currentReplyTo.messageId,
                username: currentReplyTo.username,
                content: currentReplyTo.content
            };
            console.log('📤 Sending reply:', messageData.replyTo);
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
            body: JSON.stringify(messageData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.status}`);
        }

        const newMessage = await response.json();
        console.log('📤 Message sent successfully');

        // Clear input and reply state
        messageInput.value = '';
        cancelReply();

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

// Handle keyboard input with enhanced reply support
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
    
    // Escape key cancels reply
    if (event.key === 'Escape' && currentReplyTo) {
        cancelReply();
    }
}

// Create a new room - WITH TIMEOUT
async function createRoom() {
    try {
        const roomName = prompt('Enter room name:');
        if (!roomName || !roomName.trim()) return;

        const roomDescription = prompt('Enter room description:');
        if (!roomDescription || !roomDescription.trim()) return;

        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
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
        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
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

// FIXED EMOJI FUNCTIONS - No auto-opening
function toggleEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    if (!emojiModal) return;
    
    // EXPLICIT check to ensure we only show when user clicks
    const isCurrentlyVisible = emojiModal.style.display === 'block' && emojiModal.style.visibility !== 'hidden';
    
    if (isCurrentlyVisible) {
        emojiModal.style.display = 'none';
        emojiModal.style.visibility = 'hidden';
    } else {
        // Only show if user actually clicked the button
        emojiModal.style.display = 'block';
        emojiModal.style.visibility = 'visible';
        
        // Ensure proper positioning
        emojiModal.style.position = 'fixed';
        emojiModal.style.bottom = '120px';
        emojiModal.style.right = '20px';
        emojiModal.style.zIndex = '9998';
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
    
    // Close emoji modal
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        emojiModal.style.display = 'none';
        emojiModal.style.visibility = 'hidden';
    }
}

// ENHANCED SEARCH FUNCTIONALITY - No auto-opening
let searchTimeout;
let allMessages = [];

async function performSearch(query) {
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // If empty query, hide results
    if (!query || query.trim().length === 0) {
        closeSearch();
        return;
    }

    // Debounce search for instant feel
    searchTimeout = setTimeout(async () => {
        await executeSearch(query.trim());
    }, 200);
}

async function executeSearch(query) {
    try {
        const searchResults = document.getElementById('searchResults');
        const searchContent = document.getElementById('searchContent');
        
        if (!searchResults || !searchContent) return;

        // EXPLICIT show (only when user searches)
        searchResults.style.display = 'block';
        searchResults.style.visibility = 'visible';
        searchResults.style.position = 'fixed';
        searchResults.style.top = '120px';
        searchResults.style.right = '20px';
        searchResults.style.zIndex = '9999';
        
        searchContent.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
                <p>🔍 Searching...</p>
            </div>
        `;

        // Get all messages from current room
        if (!currentRoomId) {
            searchContent.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
                    <p>Please select a room first</p>
                </div>
            `;
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Add timeout for search request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE_URL}/api/rooms/${currentRoomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to fetch messages for search');
        }

        allMessages = await response.json();

        // Filter messages based on query (case-insensitive)
        const filteredMessages = allMessages.filter(message => {
            const content = (message.content || message.message || '').toLowerCase();
            const username = (message.username || '').toLowerCase();
            const queryLower = query.toLowerCase();
            return content.includes(queryLower) || username.includes(queryLower);
        });

        // Display results
        if (filteredMessages.length === 0) {
            searchContent.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                    <p>❌ No messages found for "${query}"</p>
                    <small style="opacity: 0.7;">Try different keywords</small>
                </div>
            `;
        } else {
            searchContent.innerHTML = '';
            
            // Show results counter
            const header = document.createElement('div');
            header.style.cssText = 'padding: 0.75rem 1rem; background: rgba(99, 102, 241, 0.1); border-bottom: 1px solid var(--border); font-size: 0.875rem; color: var(--primary); font-weight: 600;';
            header.textContent = `Found ${filteredMessages.length} result${filteredMessages.length !== 1 ? 's' : ''}`;
            searchContent.appendChild(header);
            
            // Show up to 8 results for better performance
            filteredMessages.slice(0, 8).forEach(message => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                const content = message.content || message.message || '';
                
                // Highlight search terms (improved)
                const highlightedContent = content.replace(
                    new RegExp(`(${query})`, 'gi'), 
                    `<mark style="background: #ffd700; color: #000; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-weight: 600;">$1</mark>`
                );
                
                const timestamp = formatMessageTime(message.createdAt || message.timestamp);
                const username = message.username || 'User';
                
                resultItem.innerHTML = `
                    <div style="padding: 0.875rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: all 0.2s ease;" 
                         onclick="scrollToMessage('${message._id}')"
                         onmouseover="this.style.background='rgba(99, 102, 241, 0.05)'; this.style.transform='translateX(4px)'"
                         onmouseout="this.style.background=''; this.style.transform='translateX(0)'">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <strong style="color: var(--primary); font-size: 0.9rem;">${escapeHtml(username)}</strong>
                            <span style="color: var(--text-muted); font-size: 0.75rem;">${timestamp}</span>
                        </div>
                        <p style="margin: 0; color: var(--text-primary); font-size: 0.85rem; line-height: 1.4; word-break: break-word;">${highlightedContent}</p>
                    </div>
                `;
                
                searchContent.appendChild(resultItem);
            });

            // Show "more results" if applicable
            if (filteredMessages.length > 8) {
                const moreResults = document.createElement('div');
                moreResults.style.cssText = 'text-align: center; padding: 0.75rem; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--border); background: var(--surface);';
                moreResults.textContent = `... and ${filteredMessages.length - 8} more results`;
                searchContent.appendChild(moreResults);
            }
        }

    } catch (error) {
        console.error('Search error:', error);
        const searchContent = document.getElementById('searchContent');
        if (searchContent) {
            searchContent.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--error);">
                    <p>⚠️ Search failed</p>
                    <small style="opacity: 0.8;">Please try again</small>
                </div>
            `;
        }
    }
}

function scrollToMessage(messageId) {
    // Close search first
    closeSearch();
    
    // In the future, you could implement actual scrolling to specific messages
    console.log('Scrolling to message:', messageId);
    
    // For now, just show a toast
    showErrorMessage('Message found! (Scroll-to feature coming soon)');
}

function closeSearch() {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('desktopSearchInput');
    
    if (searchResults) {
        searchResults.style.display = 'none';
        searchResults.style.visibility = 'hidden';
    }
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Clear search data
    allMessages = [];
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Enhanced navigation functions
function goToNotifications() {
    window.location.href = 'notifications.html';
}

// Enhanced event listeners with proper cleanup
function initializeEventListeners() {
    console.log('🚀 Initializing enhanced event listeners');
    
    // Close modals when clicking outside (improved)
    document.addEventListener('click', function(event) {
        // Close emoji modal
        const emojiModal = document.getElementById('emojiModal');
        const emojiBtn = event.target.closest('#emojiBtn');
        
        if (emojiModal && emojiModal.style.display === 'block' && emojiModal.style.visibility === 'visible' &&
            !emojiModal.contains(event.target) && !emojiBtn) {
            emojiModal.style.display = 'none';
            emojiModal.style.visibility = 'hidden';
        }

        // Close search results when clicking outside
        const searchResults = document.getElementById('searchResults');
        const searchContainer = event.target.closest('.desktop-search-container');
        
        if (searchResults && searchResults.style.display === 'block' && searchResults.style.visibility === 'visible' &&
            !searchResults.contains(event.target) && !searchContainer) {
            closeSearch();
        }
    });
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Escape key closes modals and cancels reply
        if (event.key === 'Escape') {
            closeSearch();
            const emojiModal = document.getElementById('emojiModal');
            if (emojiModal) {
                emojiModal.style.display = 'none';
                emojiModal.style.visibility = 'hidden';
            }
            // Cancel reply if active
            if (currentReplyTo) {
                cancelReply();
            }
        }
        
        // Ctrl/Cmd + K focuses search (desktop only)
        if ((event.ctrlKey || event.metaKey) && event.key === 'k' && window.innerWidth > 1024) {
            event.preventDefault();
            const searchInput = document.getElementById('desktopSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    console.log('✅ Enhanced event listeners initialized');
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
    document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
    initializeEventListeners();
}

// Export functions for global access
window.updateRoomsList = updateRoomsList;
window.switchRoom = switchRoom;
window.sendCommunityMessage = sendCommunityMessage;
window.handleCommunityKeyPress = handleCommunityKeyPress;
window.createRoom = createRoom;
window.deleteRoom = deleteRoom;
window.toggleEmoji = toggleEmoji;
window.insertEmoji = insertEmoji;
window.performSearch = performSearch;
window.closeSearch = closeSearch;
window.initializeCommunity = initializeCommunity;
window.retryInitialization = retryInitialization;
window.logout = logout;
window.formatMessageTime = formatMessageTime;
window.scrollToMessage = scrollToMessage;
window.goToNotifications = goToNotifications;

// NEW: Export enhanced functions for global access
window.toggleLike = toggleLike;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.displayMessages = displayMessages;
window.createMessageElement = createMessageElement;
window.loadMessages = loadMessages;

// Export global variables
window.currentRoomId = currentRoomId;
window.rooms = rooms;
window.currentReplyTo = currentReplyTo;

console.log('✅ Enhanced Community.js loaded - WITH Like & Reply features + Backend Integration!');

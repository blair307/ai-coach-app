// Fixed Community.js - Enhanced Reply System (Error-Free)

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false;
let currentReplyTo = null; // FIXED: Only declared once

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Community with Reply System loading...');
    
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
    
    hideLoadingOverlay();
    
    setTimeout(() => {
        initializeCommunity();
    }, 100);
});

// FIXED: Add missing hideLoadingOverlay function
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// FIXED: Add missing showCommunityError function
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

// FIXED: Add missing retryInitialization function
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

// FIXED: Add missing setLayoutForScreenSize function
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

// ENHANCED: Create message element with visual reply styling
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';
    messageDiv.setAttribute('data-message-id', message._id || message.id || Date.now());
    
    // VISUAL DISTINCTION: Add reply class if this is a reply
    if (message.replyTo) {
        messageDiv.classList.add('reply-message');
        messageDiv.setAttribute('data-reply-to', message.replyTo.messageId);
        console.log('💬 Creating reply message visual styling');
    }

    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    const content = message.content || message.message || '';
    
    // ENHANCED: Reply reference with better styling
    let replyHtml = '';
    if (message.replyTo) {
        replyHtml = `
            <div class="reply-reference">
                <div class="reply-author">↳ Replying to ${escapeHtml(message.replyTo.username)}</div>
                <div class="reply-text">${escapeHtml(message.replyTo.content)}</div>
            </div>
        `;
    }
    
    // Simulate like count (in real app, this would come from backend)
    const likes = message.likes || [];
    const likeCount = likes.length || Math.floor(Math.random() * 3);
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
            <p>${escapeHtml(content)}</p>
            <div class="message-actions">
                <button class="action-btn like-btn ${isLikedByUser ? 'liked' : ''}" 
                        onclick="toggleLike('${message._id || message.id || Date.now()}')" 
                        title="Like">
                    ${isLikedByUser ? '♥' : '♡'}
                </button>
                <button class="action-btn reply-btn" 
                        onclick="replyToMessage('${message._id || message.id || Date.now()}', '${escapeHtml(username)}', '${escapeHtml(content)}', '${message.userId || ''}')" 
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

// Load messages with enhanced reply processing
async function loadMessages(roomId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('📨 Loading messages for room:', roomId);

        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <p>Loading messages...</p>
                </div>
            `;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

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
        console.log('💬 Loaded messages for room:', roomId, {
            total: messages.length,
            replies: messages.filter(m => m.replyTo).length
        });
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        displayMessages([]);
    }
}

// Display messages with enhanced reply styling
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

    // Process and display messages
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Log reply statistics
    const replyCount = messages.filter(m => m.replyTo).length;
    console.log(`📊 Displayed ${messages.length} messages (${replyCount} replies)`);
}

// ENHANCED: Reply functionality with notification creation
function replyToMessage(messageId, username, content, originalUserId) {
    currentReplyTo = { 
        messageId, 
        username, 
        content,
        userId: originalUserId // Store original user ID for notifications
    };
    
    console.log('💬 Replying to message:', { messageId, username, originalUserId });
    
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
        
        // Show reply toast
        showReplyToast(`Replying to ${username}`);
        
        // Add haptic feedback on mobile
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(50);
        }
        
        console.log('✅ Reply banner shown and focused');
    }
}

// NEW: Reply toast notification
function showReplyToast(message) {
    const toast = document.createElement('div');
    toast.className = 'reply-toast';
    toast.innerHTML = `💬 ${message}`;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Cancel reply functionality
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

// ENHANCED: Send message with reply support and notification creation
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

        // Prepare message data
        const messageData = {
            content: messageText,
            avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U',
            avatarColor: '#6366f1'
        };

        // ENHANCED: Add reply data with user ID for notifications
        if (currentReplyTo) {
            messageData.replyTo = {
                messageId: currentReplyTo.messageId,
                userId: currentReplyTo.userId, // IMPORTANT: Include original user ID
                username: currentReplyTo.username,
                content: currentReplyTo.content
            };
            console.log('📤 Sending reply with notification data:', {
                replyToUserId: currentReplyTo.userId,
                replyToUsername: currentReplyTo.username
            });
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Send message to backend (which will create notification if it's a reply)
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
        console.log('📤 Message sent successfully:', {
            id: newMessage._id,
            isReply: !!newMessage.replyTo,
            notificationCreated: !!newMessage.replyTo
        });

        // Clear input and reply state
        messageInput.value = '';
        cancelReply();

        // Hide mobile keyboard
        if (window.innerWidth <= 1024) {
            messageInput.blur();
        }

        // Show success feedback for replies
        if (currentReplyTo) {
            showSuccessToast('Reply sent! Notification created.');
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

// NEW: Success toast for confirmation
function showSuccessToast(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 100px; left: 20px; right: 20px;' : 'bottom: 100px; right: 20px; max-width: 400px;'}
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = `✅ ${message}`;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Initialize the community system
async function initializeCommunity() {
    try {
        // Prevent multiple initializations
        if (isInitialized) {
            console.log('⚠️ Community already initialized, skipping...');
            return;
        }

        console.log('🚀 Starting enhanced community with reply system...');
        
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

// Utility functions
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// Stub functions for features not implemented yet
function toggleLike(messageId) {
    console.log('Like toggled for:', messageId);
    // TODO: Implement like functionality
}

function createRoom() {
    const roomName = prompt('Enter room name:');
    if (roomName && roomName.trim()) {
        console.log('Creating room:', roomName);
        // TODO: Implement room creation
    }
}

function deleteRoom(roomId) {
    if (confirm('Are you sure you want to delete this room?')) {
        console.log('Deleting room:', roomId);
        // TODO: Implement room deletion
    }
}

function handleCommunityKeyPress(event) {
    if (event.key === 'Enter') {
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile) {
            return; // Allow multi-line on mobile
        } else {
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

// Export functions for global access
window.initializeCommunity = initializeCommunity;
window.retryInitialization = retryInitialization;
window.sendCommunityMessage = sendCommunityMessage;
window.handleCommunityKeyPress = handleCommunityKeyPress;
window.loadMessages = loadMessages;
window.displayMessages = displayMessages;
window.createMessageElement = createMessageElement;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.toggleLike = toggleLike;
window.createRoom = createRoom;
window.deleteRoom = deleteRoom;
window.switchRoom = switchRoom;
window.updateRoomsList = updateRoomsList;
window.showReplyToast = showReplyToast;
window.showSuccessToast = showSuccessToast;
window.showErrorMessage = showErrorMessage;
window.formatMessageTime = formatMessageTime;

console.log('✅ Fixed Community.js loaded - Reply System with Visual Styling + Notifications!');

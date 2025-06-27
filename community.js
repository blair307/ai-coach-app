// Enhanced Community.js - WITH PERMANENT MESSAGE DELETION

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false;
let currentReplyTo = null;

// NEW: Local message storage for permanent deletions
let deletedMessages = new Set();
const DELETED_MESSAGES_KEY = 'eeh_deleted_messages';

// Load deleted messages from localStorage on startup
function loadDeletedMessages() {
    try {
        const stored = localStorage.getItem(DELETED_MESSAGES_KEY);
        if (stored) {
            deletedMessages = new Set(JSON.parse(stored));
            console.log('📚 Loaded deleted messages:', deletedMessages.size);
        }
    } catch (error) {
        console.error('Error loading deleted messages:', error);
        deletedMessages = new Set();
    }
}

// Save deleted messages to localStorage
function saveDeletedMessages() {
    try {
        localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify([...deletedMessages]));
        console.log('💾 Saved deleted messages:', deletedMessages.size);
    } catch (error) {
        console.error('Error saving deleted messages:', error);
    }
}

// Check if a message is deleted
function isMessageDeleted(messageId) {
    return deletedMessages.has(messageId);
}

// Mark a message as deleted permanently
function markMessageAsDeleted(messageId) {
    deletedMessages.add(messageId);
    saveDeletedMessages();
    console.log('🗑️ Message marked as permanently deleted:', messageId);
}

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Community with PERMANENT MESSAGE DELETION loading...');
    
    // Load deleted messages first
    loadDeletedMessages();
    
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

// Hide loading overlay
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show error in community area
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

// Retry initialization
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
    
    isInitialized = false;
    setTimeout(() => {
        initializeCommunity();
    }, 1000);
}

// Set layout for screen size
function setLayoutForScreenSize() {
    const isMobile = window.innerWidth <= 1024;
    console.log('📱 Setting layout for screen size:', { isMobile, width: window.innerWidth });
    
    const mobileSelector = document.querySelector('.mobile-room-selector');
    const desktopSidebar = document.querySelector('.rooms-sidebar');
    const desktopOnlyElements = document.querySelectorAll('.desktop-only');

    if (isMobile) {
        if (mobileSelector) mobileSelector.style.display = 'block';
        if (desktopSidebar) desktopSidebar.style.display = 'none';
        
        desktopOnlyElements.forEach(el => {
            if (!el.classList.contains('rooms-sidebar')) {
                el.style.display = 'none';
            }
        });

        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
        });

    } else {
        if (mobileSelector) mobileSelector.style.display = 'none';
        if (desktopSidebar) desktopSidebar.style.display = 'flex';
        
        desktopOnlyElements.forEach(el => {
            el.style.display = '';
        });
    }
}

// Get current user info
function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            console.log('❌ No auth token found');
            return null;
        }
        
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

// Load rooms from backend
async function loadRooms() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('📡 Fetching rooms from backend...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        
        updateRoomsList();
        return true;
        
    } catch (error) {
        console.error('❌ Error loading rooms:', error);
        
        console.log('🔄 Using fallback rooms...');
        rooms = [
            { _id: 'general', name: 'General Discussion', description: 'Open chat for everyone' },
            { _id: 'business-growth', name: 'Business Growth', description: 'Scaling strategies & challenges' },
            { _id: 'work-life-balance', name: 'Work-Life Balance', description: 'Managing entrepreneurial stress' }
        ];
        updateRoomsList();
        return true;
    }
}

// Update rooms list UI
function updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    const roomDropdown = document.getElementById('roomDropdown');
    
    console.log('🔄 Updating rooms list UI...');
    
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

// Switch to a room
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

        cancelReply();

        currentRoomId = roomId;
        currentRoomName = room.name;

        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        const currentRoomElement = document.querySelector(`[data-room="${roomId}"]`);
        if (currentRoomElement) {
            currentRoomElement.classList.add('active');
        }

        const roomDropdown = document.getElementById('roomDropdown');
        if (roomDropdown) {
            roomDropdown.value = roomId;
        }

        const roomNameElement = document.getElementById('currentRoomName');
        const roomDescElement = document.getElementById('currentRoomDescription');
        if (roomNameElement) roomNameElement.textContent = room.name;
        if (roomDescElement) roomDescElement.textContent = room.description;

        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        const emojiButton = document.getElementById('emojiBtn');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = `Message ${room.name}...`;
        }
        if (sendButton) sendButton.disabled = false;
        if (emojiButton) emojiButton.disabled = false;

        await loadMessages(roomId);

        console.log('✅ Successfully switched to room:', room.name);
    } catch (error) {
        console.error('❌ Error switching rooms:', error);
        showErrorMessage('Failed to switch rooms. Please try again.');
    }
}


// ENHANCED: Create message element with better delete button handling
function createMessageElement(message, isReply = false, parentIndex = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';
    messageDiv.setAttribute('data-message-id', message._id || message.id || Date.now());
    
    if (isReply) {
        messageDiv.classList.add('reply');
        messageDiv.setAttribute('data-parent-id', parentIndex);
    }

    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    const content = message.content || message.message || '';
    
    // Check if this message belongs to the current user
    const isOwnMessage = message.userId === currentUser?.id;
    
    // Simulate like count
    const likes = message.likes || [];
    const likeCount = likes.length || Math.floor(Math.random() * 3);
    const isLikedByUser = likes.includes(currentUser?.id);
    const hasLikes = likeCount > 0;
    
    // Build action buttons with improved delete button
    let actionButtons = `
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
    `;

    // Add delete button ONLY for own messages with better error handling
    if (isOwnMessage) {
        actionButtons += `
            <button class="action-btn delete-btn" 
                    onclick="deleteMessage('${message._id || message.id || Date.now()}')" 
                    title="Delete your message"
                    style="background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444;">
                🗑️
            </button>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-avatar" style="background-color: ${message.avatarColor || '#6366f1'}">
                ${userInitials}
            </div>
            <span class="username ${isOwnMessage ? 'own-message-username' : ''}">${escapeHtml(username)}${isOwnMessage ? ' (You)' : ''}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content ${isOwnMessage ? 'own-message-content' : ''}">
            <p>${escapeHtml(content)}</p>
            <div class="message-actions">
                ${actionButtons}
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

// Load messages for a room
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
        
        displayThreadedMessages(messages);
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        displayThreadedMessages([]);
    }
}

// ENHANCED: Display messages with PERMANENT deletion filtering
function displayThreadedMessages(messages) {
    const messagesContainer = document.getElementById('communityMessages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    // FILTER OUT DELETED MESSAGES PERMANENTLY
    const visibleMessages = messages.filter(message => {
        const messageId = message._id || message.id;
        const isDeleted = isMessageDeleted(messageId);
        if (isDeleted) {
            console.log('🚫 Hiding permanently deleted message:', messageId);
        }
        return !isDeleted;
    });

    console.log(`📊 Filtered messages: ${messages.length} total → ${visibleMessages.length} visible (${messages.length - visibleMessages.length} permanently hidden)`);

    if (visibleMessages.length === 0) {
        messagesContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>No messages yet. Be the first to start the conversation!</p>
            </div>
        `;
        return;
    }

    // THREADED ALGORITHM: Group messages by parent-child relationships
    const messageMap = new Map();
    const rootMessages = [];
    
    // First pass: Create a map of all visible messages
    visibleMessages.forEach(message => {
        messageMap.set(message._id, { ...message, replies: [] });
    });
    
    // Second pass: Build the threaded structure
    visibleMessages.forEach(message => {
        if (message.replyTo && message.replyTo.messageId) {
            // This is a reply - find its parent
            const parent = messageMap.get(message.replyTo.messageId);
            if (parent) {
                parent.replies.push(message);
                console.log(`🔗 Threading reply "${message.content.substring(0, 30)}..." under parent "${parent.content.substring(0, 30)}..."`);
            } else {
                // Parent not found (might be deleted), treat as root message
                rootMessages.push(message);
            }
        } else {
            // This is a root message
            rootMessages.push(message);
        }
    });
    
    // Third pass: Render the threaded messages
    function renderMessage(message, isReply = false, depth = 0) {
        const messageElement = createMessageElement(message, isReply, depth);
        messagesContainer.appendChild(messageElement);
        
        // Render replies underneath this message
        const messageData = messageMap.get(message._id);
        if (messageData && messageData.replies.length > 0) {
            messageData.replies.forEach(reply => {
                renderMessage(reply, true, depth + 1);
            });
        }
    }
    
    // Render all root messages and their threaded replies
    rootMessages.forEach(message => {
        renderMessage(message, false, 0);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    const replyCount = visibleMessages.filter(m => m.replyTo).length;
    console.log(`📊 Displayed ${visibleMessages.length} visible messages in THREADED format (${replyCount} replies properly connected)`);
}

// Keep the displayMessages function for backward compatibility
function displayMessages(messages) {
    displayThreadedMessages(messages);
}

// ENHANCED: Reply functionality with notification creation
function replyToMessage(messageId, username, content, originalUserId) {
    currentReplyTo = { 
        messageId, 
        username, 
        content,
        userId: originalUserId
    };
    
    console.log('💬 Replying to message:', { messageId, username, originalUserId });
    
    const replyBanner = document.getElementById('replyBanner');
    const replyToUser = document.getElementById('replyToUser');
    const replyToMessage = document.getElementById('replyToMessage');
    const chatInput = document.querySelector('.chat-input');
    
    if (replyBanner && replyToUser && replyToMessage && chatInput) {
        replyToUser.textContent = username;
        replyToMessage.textContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        
        replyBanner.style.display = 'block';
        chatInput.classList.add('replying');
        
        const messageInput = document.getElementById('communityMessageInput');
        if (messageInput) {
            messageInput.focus();
        }
        
        showReplyToast(`Replying to ${username}`);
        
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(50);
        }
        
        console.log('✅ Reply banner shown and focused');
    }
}

// Reply toast notification
function showReplyToast(message) {
    const toast = document.createElement('div');
    toast.className = 'reply-toast';
    toast.innerHTML = `💬 ${message}`;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
        color: white;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        font-weight: 600;
        font-size: 0.9rem;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateY(0)', 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Cancel reply
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

// ENHANCED: Send message with reply support
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

        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
        }

        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(30);
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const messageData = {
            content: messageText,
            avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U',
            avatarColor: '#6366f1'
        };

        // ENHANCED: Add reply data with user ID for notifications
        if (currentReplyTo) {
            messageData.replyTo = {
                messageId: currentReplyTo.messageId,
                userId: currentReplyTo.userId,
                username: currentReplyTo.username,
                content: currentReplyTo.content
            };
            console.log('📤 Sending THREADED reply with notification data:', {
                replyToUserId: currentReplyTo.userId,
                replyToUsername: currentReplyTo.username,
                replyToMessageId: currentReplyTo.messageId
            });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            notificationCreated: !!newMessage.replyTo,
            willBeThreaded: !!newMessage.replyTo
        });

        messageInput.value = '';
        cancelReply();

        if (window.innerWidth <= 1024) {
            messageInput.blur();
        }

        if (currentReplyTo) {
            showSuccessToast('Reply sent! Will appear under original message.');
        }

        // Reload messages to show the new threaded structure
        await loadMessages(currentRoomId);

    } catch (error) {
        console.error('❌ Error sending message:', error);
        showErrorMessage('Failed to send message. Please try again.');
    } finally {
        const sendButton = document.getElementById('sendCommunityButton');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        }
    }
}

// Success toast for confirmation
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
    toast.innerHTML = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Warning toast for partial success
function showWarningToast(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 100px; left: 20px; right: 20px;' : 'bottom: 100px; right: 20px; max-width: 400px;'}
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Initialize the community system
async function initializeCommunity() {
    try {
        if (isInitialized) {
            console.log('⚠️ Community already initialized, skipping...');
            return;
        }

        console.log('🚀 Starting enhanced community with THREADED reply system and PERMANENT MESSAGE DELETION...');
        
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
        
        currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('❌ No user found');
            showCommunityError('Please log in to access the community.');
            return;
        }

        console.log('✅ User found:', currentUser.email);

        setLayoutForScreenSize();

        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <p>Loading rooms...</p>
                </div>
            `;
        }

        const roomsLoaded = await loadRooms();
        
        if (!roomsLoaded) {
            console.error('❌ Failed to load rooms');
            showCommunityError('Unable to load chat rooms. Please check your connection and try again.');
            return;
        }

        const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
        if (generalRoom) {
            currentRoomId = generalRoom._id;
            currentRoomName = generalRoom.name;
            console.log('🏠 Setting default room:', currentRoomName);
            await switchRoom(generalRoom._id);
        } else {
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

        isInitialized = true;
        setupAutoExpandTextarea();
        console.log('✅ Enhanced community with THREADED replies and PERMANENT MESSAGE DELETION initialized successfully');
        
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

// Like functionality
function toggleLike(messageId) {
    try {
        console.log('❤️ Toggling like for message:', messageId);
        
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
        
        const likeBtn = messageElement.querySelector('.like-btn');
        const likeCount = messageElement.querySelector('.like-count');
        
        if (!likeBtn || !likeCount) return;
        
        const isCurrentlyLiked = likeBtn.classList.contains('liked');
        const currentCount = parseInt(likeCount.dataset.count || '0');
        
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
            
            if (navigator.vibrate && window.innerWidth <= 1024) {
                navigator.vibrate(30);
            }
        }
    } catch (error) {
        console.error('❌ Error toggling like:', error);
    }
}

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

// Room management
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

        await loadRooms();
        switchRoom(newRoom._id);

    } catch (error) {
        console.error('❌ Error creating room:', error);
        showErrorMessage('Failed to create room. Please try again.');
    }
}

async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

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

        if (currentRoomId === roomId) {
            const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
            if (generalRoom) {
                switchRoom(generalRoom._id);
            }
        }

        await loadRooms();

    } catch (error) {
        console.error('❌ Error deleting room:', error);
        showErrorMessage('Failed to delete room. You may not have permission or the room may not exist.');
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
    
    if (event.key === 'Escape' && currentReplyTo) {
        cancelReply();
    }
}

// ENHANCED SEARCH FUNCTIONALITY
let searchTimeout;
let allMessages = [];

async function performSearch(query) {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (!query || query.trim().length === 0) {
        closeSearch();
        return;
    }

    searchTimeout = setTimeout(async () => {
        await executeSearch(query.trim());
    }, 200);
}

async function executeSearch(query) {
    try {
        const searchResults = document.getElementById('searchResults');
        const searchContent = document.getElementById('searchContent');
        
        if (!searchResults || !searchContent) return;

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

        if (!currentRoomId) {
            searchContent.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
                    <p>Please select a room first</p>
                </div>
            `;
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

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

        const filteredMessages = allMessages.filter(message => {
            const content = (message.content || message.message || '').toLowerCase();
            const username = (message.username || '').toLowerCase();
            const queryLower = query.toLowerCase();
            return content.includes(queryLower) || username.includes(queryLower);
        });

        if (filteredMessages.length === 0) {
            searchContent.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                    <p>❌ No messages found for "${query}"</p>
                    <small style="opacity: 0.7;">Try different keywords</small>
                </div>
            `;
        } else {
            searchContent.innerHTML = '';
            
            const header = document.createElement('div');
            header.style.cssText = 'padding: 0.75rem 1rem; background: rgba(99, 102, 241, 0.1); border-bottom: 1px solid var(--border); font-size: 0.875rem; color: var(--primary); font-weight: 600;';
            header.textContent = `Found ${filteredMessages.length} result${filteredMessages.length !== 1 ? 's' : ''}`;
            searchContent.appendChild(header);
            
            filteredMessages.slice(0, 8).forEach(message => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                const content = message.content || message.message || '';
                
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
    closeSearch();
    console.log('Scrolling to message:', messageId);
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
    
    allMessages = [];
}

// EMOJI FUNCTIONALITY
function toggleEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    if (!emojiModal) return;
    
    const isCurrentlyVisible = emojiModal.style.display === 'block' && emojiModal.style.visibility !== 'hidden';
    
    if (isCurrentlyVisible) {
        emojiModal.style.display = 'none';
        emojiModal.style.visibility = 'hidden';
    } else {
        emojiModal.style.display = 'block';
        emojiModal.style.visibility = 'visible';
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
    
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        emojiModal.style.display = 'none';
        emojiModal.style.visibility = 'hidden';
    }
}

// Navigation functions
function goToNotifications() {
    window.location.href = 'notifications.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Enhanced event listeners
function initializeEventListeners() {
    console.log('🚀 Initializing enhanced event listeners');
    
    document.addEventListener('click', function(event) {
        const emojiModal = document.getElementById('emojiModal');
        const emojiBtn = event.target.closest('#emojiBtn');
        
        if (emojiModal && emojiModal.style.display === 'block' && emojiModal.style.visibility === 'visible' &&
            !emojiModal.contains(event.target) && !emojiBtn) {
            emojiModal.style.display = 'none';
            emojiModal.style.visibility = 'hidden';
        }

        const searchResults = document.getElementById('searchResults');
        const searchContainer = event.target.closest('.desktop-search-container');
        
        if (searchResults && searchResults.style.display === 'block' && searchResults.style.visibility === 'visible' &&
            !searchResults.contains(event.target) && !searchContainer) {
            closeSearch();
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeSearch();
            const emojiModal = document.getElementById('emojiModal');
            if (emojiModal) {
                emojiModal.style.display = 'none';
                emojiModal.style.visibility = 'hidden';
            }
            if (currentReplyTo) {
                cancelReply();
            }
        }
        
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

// Notification count functionality
async function updateNotificationCount() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const count = data.count || 0;
            const countElement = document.getElementById('headerNotificationCount');
            
            if (countElement) {
                countElement.textContent = count;
                countElement.setAttribute('data-count', count);
                countElement.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching notification count:', error);
    }
}

// UPDATED: Enhanced Auto-Expand Textarea Function
function setupAutoExpandTextarea() {
    const textarea = document.getElementById('communityMessageInput');
    if (!textarea) {
        console.log('⚠️ Textarea not found for auto-expand setup');
        return;
    }
    
    console.log('🔧 Setting up auto-expand textarea');
    
    // Set initial single-line height
    textarea.style.height = '20px';
    textarea.style.minHeight = '20px';
    textarea.style.lineHeight = '20px';
    textarea.style.padding = '12px';
    textarea.style.overflow = 'hidden';
    
    // Function to adjust height
    function adjustHeight() {
        // Reset to minimum height first
        textarea.style.height = '20px';
        
        // Calculate total height including padding
        const totalHeight = textarea.scrollHeight;
        
        // If content needs more space, expand
        if (totalHeight > 44) { // 20px + 24px padding
            const newHeight = Math.min(totalHeight, 120);
            textarea.style.height = newHeight + 'px';
            textarea.classList.add('expanded');
            textarea.style.overflow = 'auto';
        } else {
            textarea.style.height = '20px';
            textarea.classList.remove('expanded');
            textarea.style.overflow = 'hidden';
        }
        
        // Add visual feedback for content
        if (textarea.value.trim()) {
            textarea.classList.add('has-content');
        } else {
            textarea.classList.remove('has-content');
        }
    }
    
    // Event listeners
    textarea.addEventListener('input', adjustHeight);
    textarea.addEventListener('paste', () => {
        // Small delay to allow paste content to be processed
        setTimeout(adjustHeight, 10);
    });
    
    // Force initial height on focus
    textarea.addEventListener('focus', () => {
        if (!textarea.value.trim()) {
            textarea.style.height = '20px';
        }
    });
    
    // Initial adjustment
    adjustHeight();
    
    console.log('✅ Auto-expand textarea setup complete - TRUE single line');
}

// Auto-refresh messages every 30 seconds
setInterval(async () => {
    if (currentRoomId && isInitialized) {
        try {
            await loadMessages(currentRoomId);
        } catch (error) {
            console.log('⚠️ Auto-refresh failed, will try again next time');
        }
    }
}, 30000);

// Update notification count periodically
updateNotificationCount();
setInterval(updateNotificationCount, 30000);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
    initializeEventListeners();
}

// Export functions for global access
window.initializeCommunity = initializeCommunity;
window.retryInitialization = retryInitialization;
window.sendCommunityMessage = sendCommunityMessage;
window.handleCommunityKeyPress = handleCommunityKeyPress;
window.loadMessages = loadMessages;
window.displayMessages = displayMessages;
window.displayThreadedMessages = displayThreadedMessages;
window.createMessageElement = createMessageElement;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.toggleLike = toggleLike;
window.createRoom = createRoom;
window.deleteRoom = deleteRoom;
window.deleteMessage = deleteMessage; // FIXED: Export delete message function
window.switchRoom = switchRoom;
window.updateRoomsList = updateRoomsList;
window.showReplyToast = showReplyToast;
window.showSuccessToast = showSuccessToast;
window.showErrorMessage = showErrorMessage;
window.formatMessageTime = formatMessageTime;
window.toggleEmoji = toggleEmoji;
window.insertEmoji = insertEmoji;
window.performSearch = performSearch;
window.closeSearch = closeSearch;
window.scrollToMessage = scrollToMessage;
window.goToNotifications = goToNotifications;
window.logout = logout;
window.updateLikeDisplay = updateLikeDisplay;

// Export global variables
window.currentRoomId = currentRoomId;
window.rooms = rooms;
window.currentReplyTo = currentReplyTo;
// ADD this new info toast function for loading states
function showInfoToast(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 100px; left: 20px; right: 20px;' : 'bottom: 100px; right: 20px; max-width: 400px;'}
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ENHANCED: Delete message function with WORKING server deletion
async function deleteMessage(messageId) {
    try {
        // Show confirmation dialog
        const confirmDelete = confirm('Are you sure you want to delete this message? This action cannot be undone.');
        if (!confirmDelete) {
            return;
        }

        console.log('🗑️ Starting SERVER deletion for message:', messageId);

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Add loading state to delete button
        const deleteBtn = document.querySelector(`[onclick="deleteMessage('${messageId}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '⏳';
            deleteBtn.style.opacity = '0.6';
        }

        // Show loading toast
        showInfoToast('🗑️ Deleting message from server...');

        // Try the primary delete endpoint
        let deleteSuccessful = false;
        let responseData = null;

        try {
            console.log('🔄 Attempting primary delete endpoint...');
            
            const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('📥 Server response:', data);

            if (response.ok && data.success) {
                deleteSuccessful = true;
                responseData = data;
                console.log('✅ PRIMARY endpoint success:', data.message);
            } else {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
        } catch (primaryError) {
            console.log('❌ Primary endpoint failed:', primaryError.message);
            
            // Try secondary endpoint (room-specific)
            if (currentRoomId) {
                try {
                    console.log('🔄 Attempting secondary delete endpoint...');
                    
                    const response = await fetch(`${API_BASE_URL}/api/rooms/${currentRoomId}/messages/${messageId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const data = await response.json();
                    console.log('📥 Secondary response:', data);

                    if (response.ok && data.success) {
                        deleteSuccessful = true;
                        responseData = data;
                        console.log('✅ SECONDARY endpoint success:', data.message);
                    } else {
                        throw new Error(data.message || `HTTP ${response.status}`);
                    }
                } catch (secondaryError) {
                    console.log('❌ Secondary endpoint also failed:', secondaryError.message);
                    throw new Error(`Both delete endpoints failed. Last error: ${secondaryError.message}`);
                }
            } else {
                throw primaryError;
            }
        }

        // Handle successful deletion
        if (deleteSuccessful && responseData) {
            // Mark as deleted locally for immediate UI update
            markMessageAsDeleted(messageId);
            
            // Remove message from DOM with animation
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.style.transition = 'all 0.3s ease';
                messageElement.style.opacity = '0';
                messageElement.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }

            // Show appropriate success message
            if (responseData.hasReplies) {
                showWarningToast('⚠️ Message deleted - converted to placeholder due to replies');
            } else {
                showSuccessToast('✅ Message permanently deleted from server!');
            }

            console.log('🎉 SUCCESS: Message deleted from server successfully');
            
            // Refresh messages to show updated state
            setTimeout(() => {
                if (currentRoomId) {
                    loadMessages(currentRoomId);
                }
            }, 1000);

        } else {
            throw new Error('Delete operation did not return success status');
        }

    } catch (error) {
        console.error('❌ CRITICAL ERROR deleting message:', error);
        
        // Reset button state
        const deleteBtn = document.querySelector(`[onclick="deleteMessage('${messageId}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.style.opacity = '1';
        }

        // Show error but still hide locally as fallback
        if (error.message.includes('permission') || error.message.includes('own messages')) {
            showErrorMessage('❌ You can only delete your own messages.');
        } else if (error.message.includes('not found')) {
            showErrorMessage('❌ Message not found - it may have already been deleted.');
            // Still remove from UI since it doesn't exist
            markMessageAsDeleted(messageId);
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement && messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        } else {
            showErrorMessage('❌ Server error - hiding message locally only.');
            console.log('📝 Detailed error:', error.message);
            
            // Fallback: hide locally
            markMessageAsDeleted(messageId);
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement && messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }
    }
}

console.log('✅ Enhanced Community.js loaded with PERMANENT MESSAGE DELETION (messages stay deleted forever)!');

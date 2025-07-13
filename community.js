// SIMPLIFIED COMMUNITY.JS - NO LOOPS, NO COMPLEX LOGIC

const API_BASE_URL = 'https://api.eehcommunity.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false;
let currentReplyTo = null;

// Simple message storage for deletions
let deletedMessages = new Set();
const DELETED_MESSAGES_KEY = 'eeh_deleted_messages';

// Load deleted messages
function loadDeletedMessages() {
    try {
        const stored = localStorage.getItem(DELETED_MESSAGES_KEY);
        if (stored) {
            deletedMessages = new Set(JSON.parse(stored));
        }
    } catch (error) {
        console.error('Error loading deleted messages:', error);
        deletedMessages = new Set();
    }
}

// Save deleted messages
function saveDeletedMessages() {
    try {
        localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify([...deletedMessages]));
    } catch (error) {
        console.error('Error saving deleted messages:', error);
    }
}

// Check if message is deleted
function isMessageDeleted(messageId) {
    return deletedMessages.has(messageId);
}

// Mark message as deleted
function markMessageAsDeleted(messageId) {
    deletedMessages.add(messageId);
    saveDeletedMessages();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simple Community Chat loading...');
    loadDeletedMessages();
    setTimeout(() => initializeCommunity(), 500);
});

// Get current user
function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.userId,
            email: payload.email,
            name: localStorage.getItem('userName') || payload.email?.split('@')[0] || 'User'
        };
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Load rooms - SIMPLE VERSION
async function loadRooms() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No token');

        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            rooms = await response.json();
        } else {
            // Fallback rooms
            rooms = [
                { _id: 'general', name: 'General Discussion', description: 'Open chat' },
                { _id: 'business', name: 'Business Growth', description: 'Scaling strategies' }
            ];
        }
        
        updateRoomsList();
        return true;
    } catch (error) {
        console.error('Error loading rooms:', error);
        rooms = [
            { _id: 'general', name: 'General Discussion', description: 'Open chat' }
        ];
        updateRoomsList();
        return true;
    }
}

// Update rooms list
function updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    const roomDropdown = document.getElementById('roomDropdown');
    
    if (roomsList && rooms.length > 0) {
        roomsList.innerHTML = '';
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.setAttribute('data-room', room._id);
            roomElement.onclick = () => switchRoom(room._id);
            
            if (room._id === currentRoomId) {
                roomElement.classList.add('active');
            }
            
            roomElement.innerHTML = `
                <h4>${room.name}</h4>
                <p>${room.description}</p>
            `;
            roomsList.appendChild(roomElement);
        });
    }
    
    if (roomDropdown && rooms.length > 0) {
        roomDropdown.innerHTML = '<option value="">Select a room</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room._id;
            option.textContent = room.name;
            option.selected = room._id === currentRoomId;
            roomDropdown.appendChild(option);
        });
    }
}

// Switch room - SIMPLE VERSION
async function switchRoom(roomId) {
    if (!roomId) return;
    
    const room = rooms.find(r => r._id === roomId);
    if (!room) return;
    
    console.log('Switching to room:', room.name);
    
    currentRoomId = roomId;
    currentRoomName = room.name;
    
    // Update UI
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
    
    // Enable inputs
    const messageInput = document.getElementById('communityMessageInput');
    const sendButton = document.getElementById('sendCommunityButton');
    const emojiButton = document.getElementById('emojiBtn');
    
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Message ${room.name}...`;
    }
    if (sendButton) sendButton.disabled = false;
    if (emojiButton) emojiButton.disabled = false;
    
    // Load messages ONCE
    await loadMessages(roomId);
}

// Load messages - SIMPLE VERSION WITH NO LOOPS
async function loadMessages(roomId) {
    try {
        console.log('Loading messages for:', roomId);
        
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No token');
        
        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="welcome-message"><p>Loading...</p></div>';
        }
        
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const messages = await response.json();
        console.log('Loaded', messages.length, 'messages');
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="welcome-message"><h3>Unable to load messages</h3><p>Please try refreshing the page.</p></div>';
        }
    }
}

// Display messages - SIMPLE VERSION
function displayMessages(messages) {
    const messagesContainer = document.getElementById('communityMessages');
    if (!messagesContainer) return;
    
    // Filter out deleted messages
    const visibleMessages = messages.filter(message => {
        const messageId = message._id || message.id;
        return !isMessageDeleted(messageId);
    });
    
    if (visibleMessages.length === 0) {
        messagesContainer.innerHTML = '<div class="welcome-message"><h3>No messages yet</h3><p>Be the first to start the conversation!</p></div>';
        return;
    }
    
    messagesContainer.innerHTML = '';
    
    visibleMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';
    messageDiv.setAttribute('data-message-id', message._id || message.id);
    
    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    const content = message.content || message.message || '';
    const isOwnMessage = message.userId === currentUser?.id;
    
    let avatarHTML = `<div class="user-avatar" style="background-color: #6366f1">${userInitials}</div>`;
    
    let actionButtons = `
        <button class="action-btn like-btn" onclick="toggleLike('${message._id || message.id}')" title="Like">♡</button>
        <button class="action-btn reply-btn" onclick="replyToMessage('${message._id || message.id}', '${username}', '${content}')" title="Reply">↳</button>
    `;
    
    if (isOwnMessage) {
        actionButtons += `<button class="action-btn delete-btn" onclick="deleteMessage('${message._id || message.id}')" title="Delete">🗑️</button>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            ${avatarHTML}
            <span class="username">${username}${isOwnMessage ? ' (You)' : ''}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content">
            <p>${content}</p>
            <div class="message-actions">${actionButtons}</div>
        </div>
    `;
    
    return messageDiv;
}

// Send message - SIMPLE VERSION
async function sendCommunityMessage() {
    try {
        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        
        if (!messageInput || !currentRoomId) return;
        
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
        }
        
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No token');
        
        const messageData = {
            content: messageText,
            avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U'
        };
        
        const response = await fetch(`${API_BASE_URL}/api/rooms/${currentRoomId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        messageInput.value = '';
        
        // Reload messages ONCE
        await loadMessages(currentRoomId);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
    } finally {
        const sendButton = document.getElementById('sendCommunityButton');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        }
    }
}

// Simple like toggle
async function toggleLike(messageId) {
    console.log('Like clicked for:', messageId);
    const likeBtn = document.querySelector(`[data-message-id="${messageId}"] .like-btn`);
    if (likeBtn) {
        likeBtn.classList.toggle('liked');
        likeBtn.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
    }
}

// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No token');
        
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            markMessageAsDeleted(messageId);
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            showToast('Message deleted', 'success');
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Failed to delete message', 'error');
    }
}

// Reply to message
function replyToMessage(messageId, username, content) {
    currentReplyTo = { messageId, username, content };
    
    const replyBanner = document.getElementById('replyBanner');
    const replyToUser = document.getElementById('replyToUser');
    const replyToMessage = document.getElementById('replyToMessage');
    
    if (replyBanner && replyToUser && replyToMessage) {
        replyToUser.textContent = username;
        replyToMessage.textContent = content.substring(0, 100);
        replyBanner.style.display = 'block';
    }
}

// Cancel reply
function cancelReply() {
    currentReplyTo = null;
    const replyBanner = document.getElementById('replyBanner');
    if (replyBanner) {
        replyBanner.style.display = 'none';
    }
}

// Initialize community - SIMPLE VERSION
async function initializeCommunity() {
    if (isInitialized) return;
    
    console.log('Initializing community...');
    
    currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('No user found');
        return;
    }
    
    await loadRooms();
    
    const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
    if (generalRoom) {
        await switchRoom(generalRoom._id);
    }
    
    isInitialized = true;
    console.log('Community initialized');
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

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${colors[type]}; color: white;
        padding: 1rem; border-radius: 8px;
        z-index: 10000; font-weight: 600;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function handleCommunityKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCommunityMessage();
    }
    if (event.key === 'Escape' && currentReplyTo) {
        cancelReply();
    }
}

// Navigation functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('mobileOverlay');
    
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('hidden');
        mainContent.classList.toggle('sidebar-hidden');
    }
}

function goToNotifications() {
    window.location.href = 'notifications.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Emoji functions
function toggleEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    if (!emojiModal) return;
    
    const isVisible = emojiModal.style.display === 'block';
    emojiModal.style.display = isVisible ? 'none' : 'block';
    emojiModal.style.visibility = isVisible ? 'hidden' : 'visible';
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('communityMessageInput');
    if (messageInput) {
        const pos = messageInput.selectionStart || messageInput.value.length;
        const text = messageInput.value;
        messageInput.value = text.substring(0, pos) + emoji + text.substring(pos);
        messageInput.focus();
    }
    toggleEmoji();
}

// Export functions globally
window.initializeCommunity = initializeCommunity;
window.sendCommunityMessage = sendCommunityMessage;
window.handleCommunityKeyPress = handleCommunityKeyPress;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.toggleLike = toggleLike;
window.deleteMessage = deleteMessage;
window.switchRoom = switchRoom;
window.toggleSidebar = toggleSidebar;
window.goToNotifications = goToNotifications;
window.logout = logout;
window.toggleEmoji = toggleEmoji;
window.insertEmoji = insertEmoji;

console.log('✅ Simple Community Chat loaded - NO LOOPS!');

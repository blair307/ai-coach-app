// Community Chat JavaScript

const API_BASE_URL = 'https://ai-coach-backend-mytn.onrender.com';

let socket; // For WebSocket connection
let currentRoom = 'general';
let currentUser = null;

// Initialize community page
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadUserData();
    initializeWebSocket();
    setupEventListeners();
    loadRoomData();
});

// Check authentication
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

// Load current user data
function loadUserData() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
}

// Initialize WebSocket connection for real-time chat
function initializeWebSocket() {
    const token = localStorage.getItem('authToken');
    
    // Replace with your WebSocket URL (likely your Railway backend with ws://)
    const wsUrl = `ws://your-railway-backend-url/ws?token=${token}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(event) {
        console.log('Connected to chat server');
        joinRoom(currentRoom);
    };
    
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    socket.onclose = function(event) {
        console.log('Disconnected from chat server');
        // Attempt to reconnect after 3 seconds
        setTimeout(initializeWebSocket, 3000);
    };
    
    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'new_message':
            addMessageToChat(data.message);
            break;
        case 'user_joined':
            updateOnlineCount(data.onlineCount);
            addSystemMessage(`${data.username} joined the room`);
            break;
        case 'user_left':
            updateOnlineCount(data.onlineCount);
            addSystemMessage(`${data.username} left the room`);
            break;
        case 'room_users':
            updateMembersList(data.users);
            break;
        case 'online_count':
            updateOnlineCount(data.count);
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    const messageInput = document.getElementById('communityMessageInput');
    const sendButton = document.getElementById('sendCommunityButton');
    
    // Enable send button when there's text
    messageInput.addEventListener('input', function() {
        sendButton.disabled = !this.value.trim();
        
        // Auto-resize textarea
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Send button click
    sendButton.addEventListener('click', sendCommunityMessage);
}

// Handle enter key press
function handleCommunityKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCommunityMessage();
    }
}

// Send message to community
function sendCommunityMessage() {
    const messageInput = document.getElementById('communityMessageInput');
    const message = messageInput.value.trim();
    
    if (!message || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    // Send message through WebSocket
    socket.send(JSON.stringify({
        type: 'send_message',
        room: currentRoom,
        message: message
    }));
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Update send button
    document.getElementById('sendCommunityButton').disabled = true;
}

// Add message to chat display
function addMessageToChat(messageData) {
    const messagesContainer = document.getElementById('communityMessages');
    const messageDiv = document.createElement('div');
    
    const timestamp = new Date(messageData.timestamp).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.className = 'message-group';
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-avatar">${getInitials(messageData.username)}</div>
            <span class="username">${messageData.username}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(messageData.message)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Add system message
function addSystemMessage(message) {
    const messagesContainer = document.getElementById('communityMessages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = 'system-message';
    messageDiv.innerHTML = `
        <div class="system-content">
            <em>${message}</em>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Switch to different room
function switchRoom(roomId) {
    if (currentRoom === roomId) return;
    
    // Leave current room
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'leave_room',
            room: currentRoom
        }));
    }
    
    // Update UI
    currentRoom = roomId;
    updateActiveRoom();
    clearMessages();
    loadRoomData();
    
    // Join new room
    if (socket && socket.readyState === WebSocket.OPEN) {
        joinRoom(roomId);
    }
}

// Join a room
function joinRoom(roomId) {
    socket.send(JSON.stringify({
        type: 'join_room',
        room: roomId
    }));
}

// Update active room in UI
function updateActiveRoom() {
    // Remove active class from all room items
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current room
    const activeRoom = document.querySelector(`[data-room="${currentRoom}"]`);
    if (activeRoom) {
        activeRoom.classList.add('active');
    }
    
    // Update room title
    const roomNames = {
        general: 'General Discussion',
        goals: 'Goal Setting',
        motivation: 'Daily Motivation',
        success: 'Success Stories'
    };
    
    const roomDescriptions = {
        general: 'Open chat for everyone to discuss anything',
        goals: 'Share and discuss your goals with the community',
        motivation: 'Daily motivation and inspiration',
        success: 'Celebrate your wins and success stories'
    };
    
    document.getElementById('currentRoomName').textContent = roomNames[currentRoom] || currentRoom;
    document.getElementById('currentRoomDescription').textContent = roomDescriptions[currentRoom] || '';
}

// Load room data
async function loadRoomData() {
    try {
        // Load recent messages for the room
        const response = await fetch(`${API_BASE_URL}/api/community/messages/${currentRoom}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            displayMessages(messages);
        }
    } catch (error) {
        console.error('Error loading room data:', error);
    }
}

// Display messages in chat
function displayMessages(messages) {
    const messagesContainer = document.getElementById('communityMessages');
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        addMessageToChat(message);
    });
}

// Clear messages
function clearMessages() {
    document.getElementById('communityMessages').innerHTML = '';
}

// Update online count
function updateOnlineCount(count) {
    const onlineCountElement = document.getElementById('onlineCount');
    if (onlineCountElement) {
        onlineCountElement.textContent = count;
    }
    
    const roomMemberCount = document.getElementById('roomMemberCount');
    if (roomMemberCount) {
        roomMemberCount.textContent = count;
    }
}

// Update members list
function updateMembersList(users) {
    const membersContent = document.querySelector('.members-content');
    if (!membersContent) return;
    
    membersContent.innerHTML = '';
    
    users.forEach(user => {
        const memberDiv = document.createElement('div');
        memberDiv.className = `member-item ${user.online ? 'online' : ''}`;
        memberDiv.innerHTML = `
            <div class="member-avatar">${getInitials(user.username)}</div>
            <div class="member-info">
                <span class="member-name">${user.username}</span>
                <span class="member-status">${user.online ? 'Online' : 'Offline'}</span>
            </div>
        `;
        membersContent.appendChild(memberDiv);
    });
}

// Toggle members list
function toggleMembersList() {
    const membersList = document.getElementById('membersList');
    const isVisible = membersList.style.display !== 'none';
    membersList.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible && socket && socket.readyState === WebSocket.OPEN) {
        // Request current room users
        socket.send(JSON.stringify({
            type: 'get_room_users',
            room: currentRoom
        }));
    }
}

// Create new room (placeholder)
function createRoom() {
    const roomName = prompt('Enter room name:');
    if (roomName && roomName.trim()) {
        alert('Room creation feature coming soon!');
    }
}

// Emoji functions
function addEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    const isVisible = emojiModal.style.display !== 'none';
    emojiModal.style.display = isVisible ? 'none' : 'block';
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('communityMessageInput');
    messageInput.value += emoji;
    messageInput.focus();
    
    // Hide emoji modal
    document.getElementById('emojiModal').style.display = 'none';
    
    // Update send button
    document.getElementById('sendCommunityButton').disabled = !messageInput.value.trim();
}

// Utility functions
function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('communityMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (socket) {
            socket.close();
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

// Close emoji modal when clicking outside
document.addEventListener('click', function(event) {
    const emojiModal = document.getElementById('emojiModal');
    const emojiButton = event.target.closest('.btn');
    
    if (emojiModal.style.display !== 'none' && 
        !emojiModal.contains(event.target) && 
        !(emojiButton && emojiButton.onclick && emojiButton.onclick.toString().includes('addEmoji'))) {
        emojiModal.style.display = 'none';
    }
});

// Community.js - Backend Connected Version for Persistent Storage
// This replaces the localStorage version with real database storage

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Community page loading...');
    initializeCommunity();
});

// Initialize the community system
async function initializeCommunity() {
    try {
        // Get current user info
        currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('No user found');
            return;
        }

        // Load all rooms from backend
        await loadRooms();
        
        // Set default room (General Discussion)
        const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
        if (generalRoom) {
            currentRoomId = generalRoom._id;
            currentRoomName = generalRoom.name;
            switchRoom(generalRoom._id);
        }
        
        console.log('Community initialized successfully');
    } catch (error) {
        console.error('Error initializing community:', error);
        // Fallback to show basic interface
        showErrorMessage('Unable to load community. Please refresh the page.');
    }
}

// Get current user info from token or localStorage
function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) return null;
        
        // Decode JWT token to get user info (simple decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.userId,
            email: payload.email,
            name: localStorage.getItem('userName') || 'User'
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Load all rooms from backend
async function loadRooms() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load rooms');
        }

        rooms = await response.json();
        console.log('Loaded rooms:', rooms);
        
        // Update the rooms list in the UI
        updateRoomsList();
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        // Use fallback default rooms if backend fails
        rooms = [
            { _id: 'general', name: 'General Discussion', description: 'Open chat for everyone' },
            { _id: 'emotional-wellness', name: 'Emotional Wellness', description: 'Mental health & emotional intelligence' },
            { _id: 'business-growth', name: 'Business Growth', description: 'Scaling strategies & challenges' },
            { _id: 'success-stories', name: 'Success Stories', description: 'Celebrate your wins & breakthroughs' },
            { _id: 'work-life-balance', name: 'Work-Life Balance', description: 'Managing entrepreneurial stress' }
        ];
        updateRoomsList();
    }
}

// Update the rooms list in the UI
function updateRoomsList() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;

    roomsList.innerHTML = '';

    rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = 'room-item';
        roomElement.setAttribute('data-room', room._id);
        
        // Mark default rooms so they can't be deleted
        if (room.isDefault) {
            roomElement.setAttribute('data-default', 'true');
        }
        
        roomElement.onclick = (e) => {
            // Don't switch room if clicking delete button
            if (e.target.classList.contains('room-delete-btn')) {
                return;
            }
            switchRoom(room._id);
        };

        // Check if this is the current room
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

// Switch to a different room
async function switchRoom(roomId) {
    try {
        // Find the room data
        const room = rooms.find(r => r._id === roomId);
        if (!room) {
            console.error('Room not found:', roomId);
            return;
        }

        // Update current room
        currentRoomId = roomId;
        currentRoomName = room.name;

        // Update UI - remove active class from all rooms
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current room
        const currentRoomElement = document.querySelector(`[data-room="${roomId}"]`);
        if (currentRoomElement) {
            currentRoomElement.classList.add('active');
        }

        // Update room title
        const roomNameElement = document.getElementById('currentRoomName');
        const roomDescElement = document.getElementById('currentRoomDescription');
        if (roomNameElement) roomNameElement.textContent = room.name;
        if (roomDescElement) roomDescElement.textContent = room.description;

        // Load messages for this room
        await loadMessages(roomId);

        console.log('Switched to room:', room.name);
    } catch (error) {
        console.error('Error switching rooms:', error);
        showErrorMessage('Failed to switch rooms. Please try again.');
    }
}

// Load messages for a specific room
async function loadMessages(roomId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load messages');
        }

        const messages = await response.json();
        console.log('Loaded messages for room:', roomId, messages);
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('Error loading messages:', error);
        // Show empty state or cached messages
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

// Send a message
async function sendCommunityMessage() {
    try {
        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        
        if (!messageInput || !currentRoomId) {
            console.error('Missing required elements or room');
            return;
        }

        const messageText = messageInput.value.trim();
        if (!messageText) {
            return;
        }

        // Disable send button
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

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
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const newMessage = await response.json();
        console.log('Message sent successfully:', newMessage);

        // Clear input
        messageInput.value = '';

        // Reload messages to show the new one
        await loadMessages(currentRoomId);

    } catch (error) {
        console.error('Error sending message:', error);
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

// Handle Enter key press in message input
function handleCommunityKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCommunityMessage();
    }
}

// Create a new room
async function createRoom() {
    const roomName = prompt('Enter room name:');
    if (!roomName || !roomName.trim()) return;

    const roomDescription = prompt('Enter room description:');
    if (!roomDescription || !roomDescription.trim()) return;

    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: roomName.trim(),
                description: roomDescription.trim()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create room');
        }

        const newRoom = await response.json();
        console.log('Room created successfully:', newRoom);

        // Reload rooms
        await loadRooms();
        
        // Switch to the new room
        switchRoom(newRoom._id);

    } catch (error) {
        console.error('Error creating room:', error);
        showErrorMessage('Failed to create room. Please try again.');
    }
}

// Delete a room
async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete room');
        }

        console.log('Room deleted successfully');

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
        console.error('Error deleting room:', error);
        showErrorMessage('Failed to delete room. You may not have permission or the room may not exist.');
    }
}

// Search functionality
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput?.value?.trim();
    
    if (!searchQuery) {
        closeSearch();
        return;
    }

    try {
        // Show search results panel
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'block';
        }

        const results = await searchMessagesAndRooms(searchQuery);
        displaySearchResults(results);

    } catch (error) {
        console.error('Error performing search:', error);
        showErrorMessage('Search failed. Please try again.');
    }
}

// Search through messages and rooms
async function searchMessagesAndRooms(query) {
    const results = [];
    
    try {
        // Search rooms by name and description
        const roomResults = rooms.filter(room => 
            room.name.toLowerCase().includes(query.toLowerCase()) ||
            room.description.toLowerCase().includes(query.toLowerCase())
        );

        roomResults.forEach(room => {
            results.push({
                type: 'room',
                title: room.name,
                preview: room.description,
                data: room
            });
        });

        // Search messages in all rooms
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (token) {
            for (const room of rooms) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/rooms/${room._id}/messages`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const messages = await response.json();
                        const matchingMessages = messages.filter(message => 
                            (message.content || message.message || '').toLowerCase().includes(query.toLowerCase())
                        );

                        matchingMessages.forEach(message => {
                            results.push({
                                type: 'message',
                                title: `Message in ${room.name}`,
                                preview: (message.content || message.message || '').substring(0, 100) + '...',
                                data: { message, room }
                            });
                        });
                    }
                } catch (error) {
                    console.error('Error searching messages in room:', room.name, error);
                }
            }
        }

    } catch (error) {
        console.error('Error in search:', error);
    }

    return results;
}

// Display search results
function displaySearchResults(results) {
    const searchContent = document.getElementById('searchContent');
    if (!searchContent) return;

    if (results.length === 0) {
        searchContent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>No results found</p>
            </div>
        `;
        return;
    }

    searchContent.innerHTML = '';

    results.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result-item';
        
        if (result.type === 'room') {
            resultElement.onclick = () => {
                switchRoom(result.data._id);
                closeSearch();
            };
        } else if (result.type === 'message') {
            resultElement.onclick = () => {
                switchRoom(result.data.room._id);
                closeSearch();
                // Optionally highlight the message
            };
        }

        resultElement.innerHTML = `
            <div class="search-result-type">${result.type}</div>
            <div class="search-result-title">${escapeHtml(result.title)}</div>
            <div class="search-result-preview">${escapeHtml(result.preview)}</div>
        `;

        searchContent.appendChild(resultElement);
    });
}

// Close search results
function closeSearch() {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    if (searchInput) {
        searchInput.value = '';
    }
}

// Add search on Enter key
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// Toggle members list (keeping for compatibility but now used for search)
function toggleMembersList() {
    // This function is kept for compatibility but now toggles search
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = searchResults.style.display === 'none' ? 'block' : 'none';
    }
}

// Add emoji functionality
function addEmoji() {
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        emojiModal.style.display = emojiModal.style.display === 'none' ? 'block' : 'none';
    }
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('communityMessageInput');
    if (messageInput) {
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(messageInput.selectionEnd);
        messageInput.value = textBefore + emoji + textAfter;
        
        // Set cursor position after emoji
        messageInput.selectionStart = messageInput.selectionEnd = cursorPos + emoji.length;
        messageInput.focus();
    }
    
    // Hide emoji modal
    const emojiModal = document.getElementById('emojiModal');
    if (emojiModal) {
        emojiModal.style.display = 'none';
    }
}

// Show error message
function showErrorMessage(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Logout function (should exist globally)
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Close emoji modal when clicking outside
document.addEventListener('click', function(event) {
    const emojiModal = document.getElementById('emojiModal');
    const addEmojiBtn = event.target.closest('button[onclick="addEmoji()"]');
    
    if (emojiModal && !emojiModal.contains(event.target) && !addEmojiBtn) {
        emojiModal.style.display = 'none';
    }
});

// Auto-refresh messages every 30 seconds
setInterval(async () => {
    if (currentRoomId) {
        await loadMessages(currentRoomId);
    }
}, 30000);

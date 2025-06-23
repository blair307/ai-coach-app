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

// Add these functions to community.js or create a separate mobile-fixes.js file

// Enhanced mobile search functionality
function performSearchMobile() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput?.value?.trim();
    
    if (!searchQuery) {
        closeSearch();
        return;
    }

    // On mobile, show search results as full screen overlay
    const isMobile = window.innerWidth <= 768;
    
    try {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'block';
            
            // Add mobile-specific styling
            if (isMobile) {
                searchResults.style.position = 'fixed';
                searchResults.style.top = '0';
                searchResults.style.left = '0';
                searchResults.style.right = '0';
                searchResults.style.bottom = '0';
                searchResults.style.width = '100vw';
                searchResults.style.height = '100vh';
                searchResults.style.zIndex = '1000';
                
                // Prevent body scrolling when search is open
                document.body.style.overflow = 'hidden';
            }
        }

        searchMessagesAndRooms(searchQuery).then(results => {
            displaySearchResults(results);
        });

    } catch (error) {
        console.error('Error performing search:', error);
        showErrorMessage('Search failed. Please try again.');
    }
}

// Enhanced close search for mobile
function closeSearchMobile() {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (searchResults) {
        searchResults.style.display = 'none';
        
        // Reset mobile-specific styles
        searchResults.style.position = '';
        searchResults.style.top = '';
        searchResults.style.left = '';
        searchResults.style.right = '';
        searchResults.style.bottom = '';
        searchResults.style.width = '';
        searchResults.style.height = '';
        searchResults.style.zIndex = '';
        
        // Re-enable body scrolling
        document.body.style.overflow = '';
    }
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur(); // Hide mobile keyboard
    }
}

// Touch-friendly room switching
function switchRoomMobile(roomId) {
    // Add haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    // Use existing switchRoom function
    switchRoom(roomId);
    
    // On mobile, scroll to chat area after switching rooms
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            const chatArea = document.querySelector('.chat-area');
            if (chatArea) {
                chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
}

// Enhanced emoji modal for mobile
function addEmojiMobile() {
    const emojiModal = document.getElementById('emojiModal');
    const isMobile = window.innerWidth <= 768;
    
    if (emojiModal) {
        const isVisible = emojiModal.style.display !== 'none';
        
        if (!isVisible) {
            emojiModal.style.display = 'block';
            
            if (isMobile) {
                // Prevent body scrolling when emoji picker is open
                document.body.style.overflow = 'hidden';
                
                // Add backdrop for mobile
                const backdrop = document.createElement('div');
                backdrop.id = 'emojiBackdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 99;
                    backdrop-filter: blur(4px);
                `;
                backdrop.onclick = () => closeEmojiMobile();
                document.body.appendChild(backdrop);
                
                // Ensure emoji modal is above backdrop
                emojiModal.style.zIndex = '100';
            }
        } else {
            closeEmojiMobile();
        }
    }
}

function closeEmojiMobile() {
    const emojiModal = document.getElementById('emojiModal');
    const backdrop = document.getElementById('emojiBackdrop');
    
    if (emojiModal) {
        emojiModal.style.display = 'none';
        emojiModal.style.zIndex = '';
    }
    
    if (backdrop) {
        backdrop.remove();
    }
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
}

// Enhanced message sending for mobile
function sendCommunityMessageMobile() {
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

    // Add mobile-specific feedback
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    // Use existing sendCommunityMessage function
    sendCommunityMessage().then(() => {
        // On mobile, hide keyboard after sending
        if (window.innerWidth <= 768) {
            messageInput.blur();
        }
    });
}

// Handle orientation change
function handleOrientationChange() {
    // Force recalculation of container heights on orientation change
    setTimeout(() => {
        const communityContainer = document.querySelector('.community-container');
        if (communityContainer) {
            communityContainer.style.height = `calc(100vh - ${window.innerWidth <= 768 ? '4rem' : '6rem'})`;
        }
        
        // Close any open modals on orientation change
        closeSearchMobile();
        closeEmojiMobile();
    }, 100);
}

// Prevent zoom on input focus (iOS Safari)
function preventInputZoom() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        if (input.style.fontSize !== '16px') {
            input.style.fontSize = '16px';
        }
    });
}

// Initialize mobile enhancements
function initializeMobileEnhancements() {
    // Override existing functions with mobile-enhanced versions
    if (window.innerWidth <= 768) {
        window.performSearch = performSearchMobile;
        window.closeSearch = closeSearchMobile;
        window.addEmoji = addEmojiMobile;
        
        // Add orientation change handler
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        
        // Prevent input zoom on iOS
        preventInputZoom();
        
        // Add touch event listeners for better mobile interaction
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('touchstart', function() {
                this.style.backgroundColor = 'var(--surface)';
            }, { passive: true });
            
            item.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.backgroundColor = '';
                }, 150);
            }, { passive: true });
        });
        
        // Enhanced scroll behavior for rooms list
        const roomsList = document.querySelector('.rooms-list');
        if (roomsList) {
            roomsList.style.webkitOverflowScrolling = 'touch';
            roomsList.style.scrollbarWidth = 'none';
        }
        
        // Add pull-to-refresh indicator (visual only)
        let pullStartY = 0;
        let pullDistance = 0;
        
        const chatMessages = document.getElementById('communityMessages');
        if (chatMessages) {
            chatMessages.addEventListener('touchstart', (e) => {
                pullStartY = e.touches[0].clientY;
            }, { passive: true });
            
            chatMessages.addEventListener('touchmove', (e) => {
                if (chatMessages.scrollTop === 0) {
                    pullDistance = e.touches[0].clientY - pullStartY;
                    if (pullDistance > 0 && pullDistance < 100) {
                        chatMessages.style.transform = `translateY(${pullDistance * 0.5}px)`;
                        chatMessages.style.opacity = 1 - (pullDistance * 0.01);
                    }
                }
            }, { passive: true });
            
            chatMessages.addEventListener('touchend', () => {
                chatMessages.style.transform = '';
                chatMessages.style.opacity = '';
                
                if (pullDistance > 50) {
                    // Reload messages on pull-to-refresh
                    if (currentRoomId) {
                        loadMessages(currentRoomId);
                    }
                }
                pullDistance = 0;
            }, { passive: true });
        }
    }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileEnhancements);
} else {
    initializeMobileEnhancements();
}

// Export functions for global use
window.performSearchMobile = performSearchMobile;
window.closeSearchMobile = closeSearchMobile;
window.addEmojiMobile = addEmojiMobile;
window.sendCommunityMessageMobile = sendCommunityMessageMobile;
window.handleOrientationChange = handleOrientationChange;

// Real-time Search Enhancement for Community Page
// Add this to the END of your community.js file or create a new file

// Global search cache and state
let searchCache = {
    rooms: [],
    messages: {},
    lastUpdate: 0
};

let searchTimeout = null;
let isSearching = false;

// Enhanced real-time search initialization
function initializeRealTimeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // Remove existing event listeners
    searchInput.removeEventListener('input', handleSearchInput);
    searchInput.removeEventListener('keydown', handleSearchKeydown);
    searchInput.removeEventListener('focus', handleSearchFocus);
    searchInput.removeEventListener('blur', handleSearchBlur);

    // Add new event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('blur', handleSearchBlur);

    // Initialize search cache
    updateSearchCache();
    
    console.log('Real-time search initialized');
}

// Handle search input with debouncing
function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // If empty query, close search
    if (!query) {
        closeSearch();
        return;
    }
    
    // Show search results immediately with loading state
    showSearchResults();
    showSearchLoading();
    
    // Debounce search execution
    searchTimeout = setTimeout(() => {
        performRealTimeSearch(query);
    }, 150); // 150ms debounce
}

// Handle special keys
function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
        closeSearch();
        event.target.blur();
    } else if (event.key === 'Enter') {
        event.preventDefault();
        const query = event.target.value.trim();
        if (query) {
            performRealTimeSearch(query);
        }
    }
}

// Handle search focus
function handleSearchFocus(event) {
    const query = event.target.value.trim();
    if (query) {
        showSearchResults();
        performRealTimeSearch(query);
    }
}

// Handle search blur (with delay to allow clicking results)
function handleSearchBlur(event) {
    setTimeout(() => {
        const searchResults = document.getElementById('searchResults');
        if (searchResults && !searchResults.matches(':hover')) {
            // Don't close if user is hovering over results
            // closeSearch();
        }
    }, 150);
}

// Show search results panel
function showSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'block';
        searchResults.classList.add('show');
        
        // On mobile, prevent body scrolling
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        }
    }
}

// Show loading state
function showSearchLoading() {
    const searchContent = document.getElementById('searchContent');
    if (searchContent) {
        searchContent.innerHTML = `
            <div class="quick-search-info">
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <div style="width: 16px; height: 16px; border: 2px solid var(--border); border-top: 2px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Searching...
                </div>
            </div>
        `;
    }
}

// Perform real-time search
async function performRealTimeSearch(query) {
    if (isSearching) return;
    isSearching = true;
    
    try {
        const results = await searchInRealTime(query);
        displayRealTimeResults(results, query);
    } catch (error) {
        console.error('Search error:', error);
        showSearchError();
    } finally {
        isSearching = false;
    }
}

// Search in real-time across cached data
async function searchInRealTime(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Update cache if needed
    if (Date.now() - searchCache.lastUpdate > 30000) { // 30 seconds
        await updateSearchCache();
    }
    
    // Search rooms
    searchCache.rooms.forEach(room => {
        const nameMatch = room.name.toLowerCase().includes(queryLower);
        const descMatch = room.description.toLowerCase().includes(queryLower);
        
        if (nameMatch || descMatch) {
            results.push({
                type: 'room',
                title: room.name,
                preview: room.description,
                data: room,
                relevance: nameMatch ? 10 : 5
            });
        }
    });
    
    // Search messages from all loaded rooms
    Object.entries(searchCache.messages).forEach(([roomId, messages]) => {
        const room = searchCache.rooms.find(r => r._id === roomId);
        if (!room) return;
        
        messages.forEach(message => {
            const content = (message.content || message.message || '').toLowerCase();
            const username = (message.username || '').toLowerCase();
            
            if (content.includes(queryLower) || username.includes(queryLower)) {
                const preview = (message.content || message.message || '').substring(0, 100);
                results.push({
                    type: 'message',
                    title: `${message.username || 'User'} in ${room.name}`,
                    preview: preview + (preview.length === 100 ? '...' : ''),
                    data: { message, room },
                    relevance: username.includes(queryLower) ? 8 : 3
                });
            }
        });
    });
    
    // Sort by relevance and limit results
    return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 20);
}

// Update search cache
async function updateSearchCache() {
    try {
        // Cache current rooms
        searchCache.rooms = [...rooms];
        
        // Cache messages from currently loaded room
        if (currentRoomId) {
            const messagesContainer = document.getElementById('communityMessages');
            if (messagesContainer) {
                const messageElements = messagesContainer.querySelectorAll('.message-group');
                const messages = Array.from(messageElements).map(el => {
                    const username = el.querySelector('.username')?.textContent || 'User';
                    const content = el.querySelector('.message-content')?.textContent || '';
                    const timestamp = el.querySelector('.message-timestamp')?.textContent || '';
                    
                    return {
                        username,
                        content,
                        message: content, // for compatibility
                        timestamp
                    };
                });
                
                searchCache.messages[currentRoomId] = messages;
            }
        }
        
        searchCache.lastUpdate = Date.now();
        console.log('Search cache updated', searchCache);
    } catch (error) {
        console.error('Error updating search cache:', error);
    }
}

// Display real-time search results
function displayRealTimeResults(results, query) {
    const searchContent = document.getElementById('searchContent');
    if (!searchContent) return;

    if (results.length === 0) {
        searchContent.innerHTML = `
            <div class="quick-search-info">
                Type to search rooms and messages in real-time
            </div>
            <div class="no-results">
                <p>No results found for "${escapeHtml(query)}"</p>
                <small>Try different keywords or check spelling</small>
            </div>
        `;
        return;
    }

    // Group results by type
    const roomResults = results.filter(r => r.type === 'room');
    const messageResults = results.filter(r => r.type === 'message');

    let html = `
        <div class="quick-search-info">
            Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${escapeHtml(query)}"
        </div>
    `;

    // Add room results
    if (roomResults.length > 0) {
        roomResults.forEach(result => {
            html += `
                <div class="search-result-item" onclick="selectSearchResult('${result.data._id}', 'room')">
                    <div class="search-result-type">Room</div>
                    <div class="search-result-title">${highlightText(escapeHtml(result.title), query)}</div>
                    <div class="search-result-preview">${highlightText(escapeHtml(result.preview), query)}</div>
                </div>
            `;
        });
    }

    // Add message results
    if (messageResults.length > 0) {
        messageResults.forEach(result => {
            html += `
                <div class="search-result-item" onclick="selectSearchResult('${result.data.room._id}', 'message')">
                    <div class="search-result-type">Message</div>
                    <div class="search-result-title">${highlightText(escapeHtml(result.title), query)}</div>
                    <div class="search-result-preview">${highlightText(escapeHtml(result.preview), query)}</div>
                </div>
            `;
        });
    }

    searchContent.innerHTML = html;
}

// Highlight search terms in text
function highlightText(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\                    <div class="search-result-preview">${highlightText(escapeHtml(');
}

// Handle search result selection
function selectSearchResult(id, type) {
    if (type === 'room' || type === 'message') {
        switchRoom(id);
        closeSearch();
        
        // Clear search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.blur();
        }
        
        // Add haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
}

// Show search error
function showSearchError() {
    const searchContent = document.getElementById('searchContent');
    if (searchContent) {
        searchContent.innerHTML = `
            <div class="no-results">
                <p>Search temporarily unavailable</p>
                <small>Please try again in a moment</small>
            </div>
        `;
    }
}

// Enhanced close search
function closeSearch() {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (searchResults) {
        searchResults.classList.remove('show');
        setTimeout(() => {
            searchResults.style.display = 'none';
        }, 300);
        
        // Re-enable body scrolling
        document.body.style.overflow = '';
    }
    
    // Clear search timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
}

// Override existing search functions
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const query = searchInput.value.trim();
        if (query) {
            performRealTimeSearch(query);
        } else {
            closeSearch();
        }
    }
}

// Update cache when switching rooms
const originalSwitchRoom = window.switchRoom;
if (originalSwitchRoom) {
    window.switchRoom = async function(roomId) {
        const result = await originalSwitchRoom(roomId);
        
        // Update search cache with new room messages
        setTimeout(() => {
            updateSearchCache();
        }, 1000);
        
        return result;
    };
}

// Update cache when sending messages
const originalSendCommunityMessage = window.sendCommunityMessage;
if (originalSendCommunityMessage) {
    window.sendCommunityMessage = async function() {
        const result = await originalSendCommunityMessage();
        
        // Update cache after sending message
        setTimeout(() => {
            updateSearchCache();
        }, 500);
        
        return result;
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRealTimeSearch);
} else {
    initializeRealTimeSearch();
}

// Re-initialize on room load
document.addEventListener('roomLoaded', updateSearchCache);

// Handle window resize for mobile optimization
function handleSearchResize() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults && searchResults.classList.contains('show')) {
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

window.addEventListener('resize', handleSearchResize);
window.addEventListener('orientationchange', handleSearchResize);

// Add CSS animation keyframes if not already present
if (!document.querySelector('#search-animations')) {
    const style = document.createElement('style');
    style.id = 'search-animations';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .search-results {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .search-result-item {
            transition: all 0.2s ease;
        }
        
        .search-result-item:hover {
            transform: translateX(4px);
        }
        
        @media (max-width: 768px) {
            .search-result-item:hover {
                transform: none;
                background: var(--surface);
            }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for global access
window.performRealTimeSearch = performRealTimeSearch;
window.closeSearch = closeSearch;
window.selectSearchResult = selectSearchResult;
window.updateSearchCache = updateSearchCache;

console.log('Real-time search system loaded successfully');

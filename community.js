/**
 * Fixed Community.js - Properly integrates with backend API
 * Replace your existing community.js with this
 */

class RoomManager {
    constructor() {
        this.rooms = [];
        this.currentRoom = 'general';
        this.baseURL = 'https://ai-coach-backend-PBSE.onrender.com/api';
        this.token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        
        if (!this.token) {
            console.error('No auth token found');
            window.location.href = 'login.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing RoomManager with backend...');
        await this.loadRooms();
        await this.loadMessages(this.currentRoom);
    }
    
    // Get authorization headers
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    // Load rooms from backend
    async loadRooms() {
        try {
            console.log('📡 Loading rooms from backend...');
            const response = await fetch(`${this.baseURL}/rooms`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.rooms = await response.json();
            console.log('✅ Loaded rooms:', this.rooms.length);
            
            // Set default room if available
            if (this.rooms.length > 0 && !this.rooms.find(r => r.name.toLowerCase().includes('general'))) {
                this.currentRoom = this.rooms[0]._id;
            } else {
                const generalRoom = this.rooms.find(r => r.name.toLowerCase().includes('general'));
                if (generalRoom) {
                    this.currentRoom = generalRoom._id;
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            // Fallback to create basic rooms
            await this.createDefaultRooms();
        }
    }
    
    // Create default rooms if none exist
    async createDefaultRooms() {
        console.log('🏗️ Creating default rooms...');
        const defaultRooms = [
            { name: 'General Discussion', description: 'Open chat for everyone' },
            { name: 'Business Growth', description: 'Discuss scaling strategies' },
            { name: 'Work-Life Balance', description: 'Managing business and personal life' },
            { name: 'Success Stories', description: 'Share your wins and achievements' }
        ];
        
        for (const roomData of defaultRooms) {
            try {
                await this.createRoom(roomData.name, roomData.description);
            } catch (error) {
                console.error('Error creating default room:', error);
            }
        }
        
        await this.loadRooms();
    }
    
    // Load messages for a specific room
    async loadMessages(roomId) {
        try {
            console.log('📡 Loading messages for room:', roomId);
            const response = await fetch(`${this.baseURL}/rooms/${roomId}/messages`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const messages = await response.json();
            console.log('✅ Loaded messages:', messages.length);
            
            // Find the room and update its messages
            const room = this.rooms.find(r => r._id === roomId);
            if (room) {
                room.messages = messages.map(msg => ({
                    id: msg._id,
                    username: msg.username || 'User',
                    avatar: msg.avatar || 'U',
                    content: msg.content || msg.message,
                    time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString(),
                    avatarColor: msg.avatarColor || '#6366f1',
                    searchable: `${msg.username} ${msg.content || msg.message}`
                }));
            }
            
            return messages;
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            return [];
        }
    }
    
    // Create a new room
    async createRoom(name, description) {
        try {
            console.log('🏗️ Creating room:', name);
            const response = await fetch(`${this.baseURL}/rooms`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ name, description })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const newRoom = await response.json();
            console.log('✅ Room created:', newRoom);
            
            // Add to local rooms array
            newRoom.messages = [];
            newRoom.messageCount = 0;
            this.rooms.push(newRoom);
            
            return newRoom;
            
        } catch (error) {
            console.error('❌ Error creating room:', error);
            throw error;
        }
    }
    
    // Send message to room
    async addMessage(roomId, messageData) {
        try {
            console.log('📤 Sending message to room:', roomId);
            const response = await fetch(`${this.baseURL}/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    content: messageData.content || messageData.message,
                    avatar: messageData.avatar || 'U',
                    avatarColor: messageData.avatarColor || '#6366f1'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const savedMessage = await response.json();
            console.log('✅ Message sent:', savedMessage);
            
            // Add to local room messages
            const room = this.rooms.find(r => r._id === roomId);
            if (room) {
                if (!room.messages) room.messages = [];
                room.messages.push({
                    id: savedMessage._id,
                    username: savedMessage.username,
                    avatar: savedMessage.avatar,
                    content: savedMessage.content,
                    time: new Date(savedMessage.createdAt).toLocaleTimeString(),
                    avatarColor: savedMessage.avatarColor,
                    searchable: `${savedMessage.username} ${savedMessage.content}`
                });
                room.messageCount = (room.messageCount || 0) + 1;
            }
            
            return savedMessage;
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }
    
    // Delete a room
    async deleteRoom(roomId) {
        try {
            console.log('🗑️ Deleting room:', roomId);
            const response = await fetch(`${this.baseURL}/rooms/${roomId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            console.log('✅ Room deleted');
            
            // Remove from local array
            this.rooms = this.rooms.filter(r => r._id !== roomId);
            
            // Switch to first available room if current room was deleted
            if (this.currentRoom === roomId && this.rooms.length > 0) {
                this.currentRoom = this.rooms[0]._id;
            }
            
        } catch (error) {
            console.error('❌ Error deleting room:', error);
            throw error;
        }
    }
    
    // Get room by ID
    getRoom(roomId) {
        return this.rooms.find(r => r._id === roomId) || this.rooms[0];
    }
    
    // Render rooms list in UI
    renderRoomsList(containerId, activeRoomId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Rooms container not found');
            return;
        }
        
        if (this.rooms.length === 0) {
            container.innerHTML = '<div class="no-rooms">No rooms available</div>';
            return;
        }
        
        container.innerHTML = this.rooms.map(room => `
            <div class="room-item ${room._id === activeRoomId ? 'active' : ''}" 
                 data-room="${room._id}" 
                 onclick="switchRoom('${room._id}')">
                <div class="room-info">
                    <h4>${room.name}</h4>
                    <p>${room.description}</p>
                </div>
                <div class="room-stats">
                    <div class="message-count">${room.messageCount || 0}</div>
                    ${!room.isDefault ? `<button class="delete-room-btn" onclick="event.stopPropagation(); deleteRoom('${room._id}')">×</button>` : ''}
                </div>
            </div>
        `).join('');
    }
}

// Initialize room manager when page loads
let roomManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Community page initializing...');
    
    // Initialize room manager
    roomManager = new RoomManager();
    
    // Export to global scope for HTML onclick handlers
    window.roomManager = roomManager;
    
    console.log('✅ Community page ready');
});

// Global functions for HTML onclick handlers
window.switchRoom = async function(roomId) {
    console.log('🔄 Switching to room:', roomId);
    
    if (!roomManager) {
        console.error('RoomManager not initialized');
        return;
    }
    
    // Load messages for the new room
    await roomManager.loadMessages(roomId);
    
    // Update current room
    roomManager.currentRoom = roomId;
    window.currentRoom = roomId; // For compatibility
    
    // Update UI
    const room = roomManager.getRoom(roomId);
    if (room) {
        document.getElementById('currentRoomName').textContent = room.name;
        document.getElementById('currentRoomDescription').textContent = room.description;
        
        // Update active room styling
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });
        const roomElement = document.querySelector(`[data-room="${roomId}"]`);
        if (roomElement) {
            roomElement.classList.add('active');
        }
        
        // Load room messages
        loadRoomMessages(roomId);
        
        // Clear any active search
        if (window.clearSearch) {
            window.clearSearch();
        }
    }
};

window.createRoom = async function() {
    const name = prompt('Enter room name:');
    if (!name || !name.trim()) return;
    
    const description = prompt('Enter room description:') || 'Custom chat room';
    
    if (!roomManager) {
        console.error('RoomManager not initialized');
        return;
    }
    
    try {
        await roomManager.createRoom(name.trim(), description.trim());
        roomManager.renderRoomsList('roomsList', roomManager.currentRoom);
        showToast('Room created successfully!', 'success');
    } catch (error) {
        console.error('Error creating room:', error);
        showToast('Error creating room: ' + error.message, 'error');
    }
};

window.deleteRoom = async function(roomId) {
    if (!confirm('Are you sure you want to delete this room? All messages will be lost.')) {
        return;
    }
    
    if (!roomManager) {
        console.error('RoomManager not initialized');
        return;
    }
    
    try {
        await roomManager.deleteRoom(roomId);
        roomManager.renderRoomsList('roomsList', roomManager.currentRoom);
        
        // If we deleted the current room, switch to the first available room
        if (roomId === roomManager.currentRoom && roomManager.rooms.length > 0) {
            await window.switchRoom(roomManager.rooms[0]._id);
        }
        
        showToast('Room deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting room:', error);
        showToast('Error deleting room: ' + error.message, 'error');
    }
};

window.sendCommunityMessage = async function() {
    const input = document.getElementById('communityMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!roomManager) {
        console.error('RoomManager not initialized');
        return;
    }
    
    try {
        await roomManager.addMessage(roomManager.currentRoom, {
            content: message
        });
        
        // Reload messages to show new message
        loadRoomMessages(roomManager.currentRoom);
        
        // Update rooms list to show new message count
        roomManager.renderRoomsList('roomsList', roomManager.currentRoom);
        
        // Clear input
        input.value = '';
        
        console.log('✅ Message sent successfully');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showToast('Error sending message: ' + error.message, 'error');
    }
};

window.loadRoomMessages = function(roomId) {
    const chatMessages = document.getElementById('communityMessages');
    if (!chatMessages) return;
    
    const room = roomManager ? roomManager.getRoom(roomId) : null;
    
    if (!room) {
        chatMessages.innerHTML = '<div class="empty-room"><p>Room not found.</p></div>';
        return;
    }
    
    if (room.messages && room.messages.length > 0) {
        chatMessages.innerHTML = room.messages.map(message => `
            <div class="message-group" data-searchable="${message.searchable}">
                <div class="message-header">
                    <div class="user-avatar" style="background: ${message.avatarColor || '#6366f1'};">${message.avatar}</div>
                    <span class="username">${message.username}</span>
                    <span class="message-timestamp">${message.time}</span>
                </div>
                <div class="message-content">${message.content}</div>
            </div>
        `).join('');
    } else {
        chatMessages.innerHTML = `
            <div class="empty-room">
                <p>This room is ready for conversation!</p>
                <p>Be the first to share something with the ${room.name.toLowerCase()} community.</p>
            </div>
        `;
    }
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Toast notification helper
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#6366f1'
    };
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Handle message input keypress
window.handleCommunityKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendCommunityMessage();
    }
};

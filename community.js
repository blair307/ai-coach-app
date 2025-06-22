/**
 * FIXED Community.js - Permanent Solution for Room Rendering
 * Replace your community.js with this version
 */

class RoomManager {
    constructor() {
        this.rooms = [];
        this.currentRoom = null;
        this.baseURL = 'https://ai-coach-backend-pbse.onrender.com/api';
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
        
        // CRITICAL: Wait for DOM to be ready before rendering
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.renderRoomsWithRetry();
            });
        } else {
            this.renderRoomsWithRetry();
        }
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
            
            // Set default room
            if (this.rooms.length > 0) {
                const generalRoom = this.rooms.find(r => r.name.toLowerCase().includes('general'));
                this.currentRoom = generalRoom ? generalRoom._id : this.rooms[0]._id;
            }
            
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            this.rooms = [];
        }
    }
    
    // FIXED: Render rooms with retry mechanism
    renderRoomsWithRetry() {
        let attempts = 0;
        const maxAttempts = 5;
        
        const tryRender = () => {
            attempts++;
            console.log(`🎯 Render attempt ${attempts}/${maxAttempts}`);
            
            const container = document.getElementById('roomsList');
            if (!container) {
                console.warn('⚠️ Rooms container not found, retrying...');
                if (attempts < maxAttempts) {
                    setTimeout(tryRender, 500);
                }
                return;
            }
            
            this.renderRoomsList('roomsList', this.currentRoom);
            console.log('✅ Rooms rendered successfully');
        };
        
        tryRender();
    }
    
    // Create room
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
            
            // Re-render immediately
            this.renderRoomsList('roomsList', this.currentRoom);
            
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
            
            return savedMessage;
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }
    
    // Load messages for a room
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
            
            return messages.map(msg => ({
                id: msg._id,
                username: msg.username || 'User',
                avatar: msg.avatar || 'U',
                content: msg.content || msg.message,
                time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString(),
                avatarColor: msg.avatarColor || '#6366f1',
                searchable: `${msg.username} ${msg.content || msg.message}`
            }));
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            return [];
        }
    }
    
    // Get room by ID
    getRoom(roomId) {
        return this.rooms.find(r => r._id === roomId) || this.rooms[0];
    }
    
    // FIXED: Robust room rendering
    renderRoomsList(containerId, activeRoomId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Rooms container not found:', containerId);
            return;
        }
        
        console.log('🎨 Rendering rooms:', this.rooms.length, 'Active:', activeRoomId);
        
        if (this.rooms.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #666;">
                    <p>No rooms available</p>
                    <button onclick="createRoom()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;">Create First Room</button>
                </div>
            `;
            return;
        }
        
        // Force innerHTML update
        const roomsHTML = this.rooms.map(room => `
            <div class="room-item ${room._id === activeRoomId ? 'active' : ''}" 
                 data-room="${room._id}" 
                 onclick="switchRoom('${room._id}')"
                 style="padding: 1rem; margin: 0.5rem 0; background: ${room._id === activeRoomId ? '#6366f1' : '#f8fafc'}; color: ${room._id === activeRoomId ? 'white' : '#333'}; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0;">
                <div class="room-info">
                    <h4 style="margin: 0 0 0.25rem 0; font-size: 0.95rem;">${room.name}</h4>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.8;">${room.description}</p>
                </div>
                <div class="room-stats" style="text-align: right; margin-top: 0.5rem;">
                    <span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">${room.messageCount || 0} messages</span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = roomsHTML;
        console.log('✅ Rooms HTML updated, container children:', container.children.length);
        
        // Force refresh
        container.style.display = 'none';
        container.offsetHeight; // Trigger reflow
        container.style.display = 'block';
    }
}

// Initialize room manager
let roomManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Community page DOM loaded');
    
    // Initialize room manager
    roomManager = new RoomManager();
    
    // Export to global scope
    window.roomManager = roomManager;
    
    console.log('✅ Community page ready');
});

// GLOBAL FUNCTIONS - Simplified and Fixed
window.switchRoom = async function(roomId) {
    console.log('🔄 Switching to room:', roomId);
    
    if (!roomManager) {
        console.error('RoomManager not initialized');
        return;
    }
    
    try {
        // Load messages for the new room
        const messages = await roomManager.loadMessages(roomId);
        
        // Update current room
        roomManager.currentRoom = roomId;
        
        // Update UI
        const room = roomManager.getRoom(roomId);
        if (room) {
            document.getElementById('currentRoomName').textContent = room.name;
            document.getElementById('currentRoomDescription').textContent = room.description;
            
            // Update room messages display
            loadRoomMessages(roomId, messages);
            
            // Re-render rooms list to update active state
            roomManager.renderRoomsList('roomsList', roomId);
        }
        
        console.log('✅ Switched to room:', room?.name);
        
    } catch (error) {
        console.error('❌ Error switching room:', error);
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
        showToast('Room created successfully!', 'success');
    } catch (error) {
        console.error('Error creating room:', error);
        showToast('Error creating room: ' + error.message, 'error');
    }
};

window.sendCommunityMessage = async function() {
    const input = document.getElementById('communityMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!roomManager || !roomManager.currentRoom) {
        console.error('No active room');
        return;
    }
    
    try {
        await roomManager.addMessage(roomManager.currentRoom, {
            content: message
        });
        
        // Reload messages
        const messages = await roomManager.loadMessages(roomManager.currentRoom);
        loadRoomMessages(roomManager.currentRoom, messages);
        
        // Clear input
        input.value = '';
        
        console.log('✅ Message sent successfully');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showToast('Error sending message: ' + error.message, 'error');
    }
};

window.loadRoomMessages = function(roomId, messages = []) {
    const chatMessages = document.getElementById('communityMessages');
    if (!chatMessages) return;
    
    if (messages.length === 0) {
        const room = roomManager?.getRoom(roomId);
        chatMessages.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p>This room is ready for conversation!</p>
                <p>Be the first to share something with the ${room?.name?.toLowerCase() || 'community'}.</p>
            </div>
        `;
        return;
    }
    
    chatMessages.innerHTML = messages.map(message => `
        <div class="message-group" style="margin-bottom: 1.5rem;">
            <div class="message-header" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <div class="user-avatar" style="width: 32px; height: 32px; background: ${message.avatarColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">${message.avatar}</div>
                <span class="username" style="font-weight: 600; color: #374151;">${message.username}</span>
                <span class="message-timestamp" style="color: #9ca3af; font-size: 0.8rem;">${message.time}</span>
            </div>
            <div class="message-content" style="margin-left: 2.5rem; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${message.avatarColor};">${message.content}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Toast helper
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${colors[type]};
        color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// Handle message input
window.handleCommunityKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendCommunityMessage();
    }
};

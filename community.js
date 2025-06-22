/**
 * FINAL FIXED Community.js - All Issues Resolved
 * Replace your entire community.js with this
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
        console.log('🚀 Initializing RoomManager...');
        await this.loadRooms();
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.renderRoomsWithRetry();
            });
        } else {
            this.renderRoomsWithRetry();
        }
    }
    
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async loadRooms() {
        try {
            console.log('📡 Loading rooms...');
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
                console.log('📍 Current room set to:', this.currentRoom);
            }
            
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            this.rooms = [];
        }
    }
    
    renderRoomsWithRetry() {
        let attempts = 0;
        const maxAttempts = 3;
        
        const tryRender = () => {
            attempts++;
            const container = document.getElementById('roomsList');
            if (!container && attempts < maxAttempts) {
                setTimeout(tryRender, 500);
                return;
            }
            
            this.renderRoomsList('roomsList', this.currentRoom);
        };
        
        tryRender();
    }
    
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
            newRoom.messageCount = 0;
            this.rooms.push(newRoom);
            
            this.renderRoomsList('roomsList', this.currentRoom);
            return newRoom;
            
        } catch (error) {
            console.error('❌ Error creating room:', error);
            throw error;
        }
    }
    
    async addMessage(roomId, messageData) {
        try {
            console.log('📤 Sending message to room:', roomId);
            const response = await fetch(`${this.baseURL}/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    content: messageData.content,
                    avatar: messageData.avatar || 'U',
                    avatarColor: messageData.avatarColor || '#6366f1'
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const savedMessage = await response.json();
            console.log('✅ Message sent successfully');
            return savedMessage;
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }
    
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
                avatarColor: msg.avatarColor || '#6366f1'
            }));
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            return [];
        }
    }
    
    getRoom(roomId) {
        return this.rooms.find(r => r._id === roomId) || this.rooms[0];
    }
    
    // FIXED: Proper room rendering with blue active state
    renderRoomsList(containerId, activeRoomId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Container not found:', containerId);
            return;
        }
        
        console.log('🎨 Rendering rooms:', this.rooms.length);
        
        if (this.rooms.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #666;">
                    <p>No rooms available</p>
                    <button onclick="createRoom()" class="btn btn-primary" style="margin-top: 1rem;">Create First Room</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.rooms.map(room => {
            const isActive = room._id === activeRoomId;
            return `
                <div class="room-item ${isActive ? 'active' : ''}" 
                     data-room="${room._id}" 
                     onclick="switchRoom('${room._id}')"
                     style="
                        padding: 1rem; 
                        margin: 0.5rem 0; 
                        background: ${isActive ? '#6366f1' : '#f8fafc'}; 
                        color: ${isActive ? 'white' : '#374151'}; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        border: 1px solid ${isActive ? '#6366f1' : '#e2e8f0'}; 
                        transition: all 0.2s ease;
                     ">
                    <div class="room-info">
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 0.95rem; font-weight: 600;">${room.name}</h4>
                        <p style="margin: 0; font-size: 0.8rem; opacity: 0.8;">${room.description}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Rooms rendered with active state:', activeRoomId);
    }
}

// Initialize
let roomManager;

document.addEventListener('DOMContentLoaded', function() {
    roomManager = new RoomManager();
    window.roomManager = roomManager;
});

// FIXED: All global functions
window.switchRoom = async function(roomId) {
    console.log('🔄 Switching to room:', roomId);
    
    if (!roomManager) return;
    
    try {
        const messages = await roomManager.loadMessages(roomId);
        roomManager.currentRoom = roomId;
        
        const room = roomManager.getRoom(roomId);
        if (room) {
            document.getElementById('currentRoomName').textContent = room.name;
            document.getElementById('currentRoomDescription').textContent = room.description;
            
            // FIXED: Safe message loading
            window.loadRoomMessages(roomId, messages);
            roomManager.renderRoomsList('roomsList', roomId);
        }
        
    } catch (error) {
        console.error('❌ Error switching room:', error);
    }
};

window.createRoom = async function() {
    const name = prompt('Enter room name:');
    if (!name?.trim()) return;
    
    const description = prompt('Enter room description:') || 'Custom chat room';
    
    try {
        await roomManager.createRoom(name.trim(), description.trim());
        window.showToast('Room created!', 'success');
    } catch (error) {
        window.showToast('Error creating room', 'error');
    }
};

window.sendCommunityMessage = async function() {
    const input = document.getElementById('communityMessageInput');
    const message = input.value?.trim();
    
    if (!message || !roomManager?.currentRoom) return;
    
    try {
        await roomManager.addMessage(roomManager.currentRoom, {
            content: message
        });
        
        // Reload messages
        const messages = await roomManager.loadMessages(roomManager.currentRoom);
        window.loadRoomMessages(roomManager.currentRoom, messages);
        
        input.value = '';
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        window.showToast('Error sending message', 'error');
    }
};

// FIXED: Safe message loading function
window.loadRoomMessages = function(roomId, messages) {
    const chatMessages = document.getElementById('communityMessages');
    if (!chatMessages) return;
    
    // SAFETY CHECK: Ensure messages is an array
    if (!Array.isArray(messages)) {
        console.warn('⚠️ Messages not an array:', typeof messages);
        messages = [];
    }
    
    if (messages.length === 0) {
        const room = roomManager?.getRoom(roomId);
        chatMessages.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p>This room is ready for conversation!</p>
                <p>Be the first to share with ${room?.name || 'the community'}.</p>
            </div>
        `;
        return;
    }
    
    try {
        chatMessages.innerHTML = messages.map(message => `
            <div class="message-group" style="margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <div style="width: 32px; height: 32px; background: ${message.avatarColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">${message.avatar}</div>
                    <span style="font-weight: 600; color: #374151;">${message.username}</span>
                    <span style="color: #9ca3af; font-size: 0.8rem;">${message.time}</span>
                </div>
                <div style="margin-left: 2.5rem; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${message.avatarColor};">${message.content}</div>
            </div>
        `).join('');
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error('❌ Error rendering messages:', error);
        chatMessages.innerHTML = '<div style="padding: 1rem; color: #ef4444;">Error loading messages</div>';
    }
};

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: ${colors[type]}; color: white; 
        padding: 1rem 1.5rem; border-radius: 8px; 
        z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

window.handleCommunityKeyPress = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendCommunityMessage();
    }
};

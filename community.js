/**
 * PERMANENT FIXED Community.js - All Issues Resolved
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
    
    // FIXED: Room rendering with proper blue active state
    renderRoomsList(containerId, activeRoomId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Container not found:', containerId);
            return;
        }
        
        console.log('🎨 Rendering rooms:', this.rooms.length, 'Active:', activeRoomId);
        
        if (this.rooms.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #666;">
                    <p>No rooms available</p>
                    <button onclick="createRoom()" class="btn btn-primary" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;">Create First Room</button>
                </div>
            `;
            return;
        }
        
        // Force complete re-render with proper styling
        container.innerHTML = this.rooms.map(room => {
            const isActive = room._id === activeRoomId;
            const backgroundColor = isActive ? '#6366f1' : '#f8fafc';
            const textColor = isActive ? 'white' : '#374151';
            const borderColor = isActive ? '#6366f1' : '#e2e8f0';
            
            return `
                <div class="room-item ${isActive ? 'active' : ''}" 
                     data-room="${room._id}" 
                     onclick="switchRoom('${room._id}')"
                     style="
                        padding: 1rem; 
                        margin: 0.5rem 0; 
                        background: ${backgroundColor} !important; 
                        color: ${textColor} !important; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        border: 1px solid ${borderColor}; 
                        transition: all 0.2s ease;
                        box-shadow: ${isActive ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'};
                     ">
                    <div class="room-info">
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 0.95rem; font-weight: 600; color: inherit;">${room.name}</h4>
                        <p style="margin: 0; font-size: 0.8rem; opacity: 0.8; color: inherit;">${room.description}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        // Force DOM refresh
        container.style.display = 'none';
        container.offsetHeight;
        container.style.display = 'block';
        
        console.log('✅ Rooms rendered with blue active state');
    }
}

// Initialize
let roomManager;

document.addEventListener('DOMContentLoaded', function() {
    roomManager = new RoomManager();
    window.roomManager = roomManager;
});

// FIXED: Switch room with proper color updates
window.switchRoom = async function(roomId) {
    console.log('🔄 Switching to room:', roomId);
    
    if (!roomManager) return;
    
    try {
        // Load messages first
        const messages = await roomManager.loadMessages(roomId);
        
        // Update current room
        roomManager.currentRoom = roomId;
        
        // Update room info
        const room = roomManager.getRoom(roomId);
        if (room) {
            document.getElementById('currentRoomName').textContent = room.name;
            document.getElementById('currentRoomDescription').textContent = room.description;
        }
        
        // CRITICAL: Force re-render rooms with new active state
        roomManager.renderRoomsList('roomsList', roomId);
        
        // Display messages safely
        displayRoomMessages(roomId, messages);
        
        console.log('✅ Room switched with visual update');
        
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

// FIXED: Message sending without errors
window.sendCommunityMessage = async function() {
    const input = document.getElementById('communityMessageInput');
    const message = input.value?.trim();
    
    if (!message || !roomManager?.currentRoom) {
        console.log('❌ No message or room selected');
        return;
    }
    
    try {
        console.log('📤 Sending message:', message);
        
        // Send message to backend
        await roomManager.addMessage(roomManager.currentRoom, {
            content: message
        });
        
        // Clear input immediately
        input.value = '';
        
        // Reload messages and display
        const messages = await roomManager.loadMessages(roomManager.currentRoom);
        displayRoomMessages(roomManager.currentRoom, messages);
        
        console.log('✅ Message sent and displayed');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        window.showToast('Error sending message', 'error');
    }
};

// FIXED: Safe message display function
function displayRoomMessages(roomId, messages) {
    const chatMessages = document.getElementById('communityMessages');
    if (!chatMessages) return;
    
    // Safety check
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
}

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

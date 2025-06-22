// room-manager.js
// Community room management system

class RoomManager {
    constructor() {
        this.rooms = {};
        this.currentRoom = 'general';
        this.initialized = false;
    }

    // Initialize the room system
    init() {
        if (this.initialized) return;
        
        this.loadRooms();
        this.initialized = true;
        
        console.log('Room Manager initialized with', Object.keys(this.rooms).length, 'rooms');
    }

    // Load rooms from localStorage or set defaults
    loadRooms() {
        const saved = localStorage.getItem('eeh_rooms');
        if (saved) {
            try {
                this.rooms = JSON.parse(saved);
                return;
            } catch (e) {
                console.log('Error loading saved rooms:', e);
            }
        }

        // Default rooms
        this.rooms = {
            'general': {
                id: 'general',
                name: 'General Discussion',
                description: 'Open chat for everyone to discuss anything',
                created: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
                createdBy: 'System',
                messageCount: 5,
                isDefault: true,
                messages: [
                    {username: 'Mike Chen', avatar: 'MC', time: '2:30 PM', content: "That's awesome Sarah! What was your biggest breakthrough?", searchable: 'mike chen biggest breakthrough sarah'},
                    {username: 'Sarah Johnson', avatar: 'SJ', time: '2:32 PM', content: 'Realizing that I was setting too many goals at once. The AI helped me prioritize and focus on just 2-3 key areas. Game changer!', searchable: 'sarah johnson goals prioritize ai game changer', avatarColor: '#10b981'},
                    {username: 'Alex Rivera', avatar: 'AR', time: '2:35 PM', content: "Love that! I've been struggling with the same thing. Quality over quantity when it comes to goals really does make a difference in productivity.", searchable: 'alex rivera focus quality productivity', avatarColor: '#f59e0b'},
                    {username: 'Mike Chen', avatar: 'MC', time: '2:38 PM', content: 'Has anyone tried the new stress management exercises from the latest coaching session? Curious about your experiences.', searchable: 'mike chen coaching session stress management'},
                    {username: 'Sarah Johnson', avatar: 'SJ', time: '2:40 PM', content: '@Mike the breathing technique has been really helpful! I use it before important meetings now.', searchable: 'sarah johnson meditation breathing technique', avatarColor: '#10b981'}
                ]
            },
            'emotional-wellness': {
                id: 'emotional-wellness',
                name: 'Emotional Wellness',
                description: 'Mental health & emotional intelligence discussions',
                created: Date.now() - (25 * 24 * 60 * 60 * 1000),
                createdBy: 'System',
                messageCount: 12,
                isDefault: true,
                messages: []
            },
            'business-growth': {
                id: 'business-growth',
                name: 'Business Growth',
                description: 'Scaling strategies & business challenges',
                created: Date.now() - (20 * 24 * 60 * 60 * 1000),
                createdBy: 'System',
                messageCount: 8,
                isDefault: true,
                messages: []
            },
            'success-stories': {
                id: 'success-stories',
                name: 'Success Stories',
                description: 'Celebrate your wins & breakthroughs',
                created: Date.now() - (15 * 24 * 60 * 60 * 1000),
                createdBy: 'System',
                messageCount: 3,
                isDefault: true,
                messages: []
            },
            'work-life-balance': {
                id: 'work-life-balance',
                name: 'Work-Life Balance',
                description: 'Managing entrepreneurial stress and balance',
                created: Date.now() - (10 * 24 * 60 * 60 * 1000),
                createdBy: 'System',
                messageCount: 7,
                isDefault: true,
                messages: []
            }
        };

        this.saveRooms();
    }

    // Save rooms to localStorage
    saveRooms() {
        localStorage.setItem('eeh_rooms', JSON.stringify(this.rooms));
    }

    // Create a new room
    createRoom(name, description, createdBy = 'You') {
        // Validate input
        if (!name || name.trim().length < 3) {
            throw new Error('Room name must be at least 3 characters long');
        }

        if (!description || description.trim().length < 10) {
            throw new Error('Room description must be at least 10 characters long');
        }

        // Create room ID from name
        const roomId = name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);

        // Check if room already exists
        if (this.rooms[roomId]) {
            throw new Error('A room with this name already exists');
        }

        // Create new room
        const newRoom = {
            id: roomId,
            name: name.trim(),
            description: description.trim(),
            created: Date.now(),
            createdBy: createdBy,
            messageCount: 0,
            isDefault: false,
            messages: []
        };

        this.rooms[roomId] = newRoom;
        this.saveRooms();

        // Add notification about new room
        if (window.notificationManager) {
            window.notificationManager.addNotification({
                type: 'community',
                title: `New Room Created: ${name}`,
                message: `"${name}" room has been created. Join the conversation!`,
                time: 'Just now'
            });
        }

        console.log('New room created:', newRoom);
        return newRoom;
    }

    // Get all rooms
    getRooms() {
        return this.rooms;
    }

    // Get room by ID
    getRoom(roomId) {
        return this.rooms[roomId];
    }

    // Delete room (only non-default rooms)
    deleteRoom(roomId) {
        const room = this.rooms[roomId];
        if (!room) {
            throw new Error('Room not found');
        }

        if (room.isDefault) {
            throw new Error('Cannot delete default rooms');
        }

        delete this.rooms[roomId];
        this.saveRooms();

        console.log('Room deleted:', roomId);
        return true;
    }

    // Add message to room
    addMessage(roomId, message) {
        const room = this.rooms[roomId];
        if (!room) {
            throw new Error('Room not found');
        }

        const newMessage = {
            id: Date.now(),
            username: message.username || 'You',
            avatar: message.avatar || 'YU',
            time: new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}),
            content: message.content,
            searchable: `${message.username || 'you'} ${message.content.toLowerCase()}`,
            avatarColor: message.avatarColor || '#6366f1',
            timestamp: Date.now()
        };

        room.messages.push(newMessage);
        room.messageCount++;
        this.saveRooms();

        return newMessage;
    }

    // Render rooms list
    renderRoomsList(containerId, activeRoomId = 'general') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const roomsArray = Object.values(this.rooms).sort((a, b) => {
            // Default rooms first, then by creation date
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return b.created - a.created;
        });

        container.innerHTML = roomsArray.map(room => `
            <div class="room-item ${room.id === activeRoomId ? 'active' : ''}" 
                 data-room="${room.id}" 
                 data-message-count="${room.messageCount}" 
                 onclick="switchRoom('${room.id}')">
                <div class="room-info">
                    <h4>${room.name}</h4>
                    <p>${room.description}</p>
                    ${!room.isDefault ? '<small style="color: var(--text-muted); font-size: 0.75rem;">Created by ' + room.createdBy + '</small>' : ''}
                </div>
                <div class="room-stats">
                    <span class="message-count">${room.messageCount}</span>
                    ${!room.isDefault ? '<button class="delete-room-btn" onclick="event.stopPropagation(); deleteRoom(\'' + room.id + '\')" title="Delete Room">×</button>' : ''}
                </div>
            </div>
        `).join('');
    }
}

// Create global instance
window.roomManager = new RoomManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.roomManager.init();
});

// New Room Modal Functions
function createRoom() {
    showNewRoomModal();
}

function showNewRoomModal() {
    const modalHTML = `
        <div class="modal" id="newRoomModal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Create New Room</h3>
                    <button class="close-btn" onclick="closeNewRoomModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="newRoomForm" onsubmit="handleCreateRoom(event)">
                        <div class="form-group">
                            <label for="roomName">Room Name *</label>
                            <input type="text" id="roomName" required maxlength="50" 
                                   placeholder="e.g., Marketing Strategies" 
                                   style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); font-family: inherit;">
                            <small>3-50 characters, will be used to create room URL</small>
                        </div>
                        <div class="form-group">
                            <label for="roomDescription">Room Description *</label>
                            <textarea id="roomDescription" required maxlength="200" rows="3"
                                      placeholder="Describe what this room is for..." 
                                      style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); font-family: inherit; resize: vertical;"></textarea>
                            <small>10-200 characters describing the room's purpose</small>
                        </div>
                        <div id="roomError" style="color: var(--error); font-size: 0.875rem; margin-top: 0.5rem; display: none;"></div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeNewRoomModal()">Cancel</button>
                    <button type="submit" form="newRoomForm" class="btn btn-primary">Create Room</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('newRoomModal');
    if (existing) existing.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus on room name input
    setTimeout(() => {
        document.getElementById('roomName').focus();
    }, 100);
}

function closeNewRoomModal() {
    const modal = document.getElementById('newRoomModal');
    if (modal) modal.remove();
}

function handleCreateRoom(event) {
    event.preventDefault();
    
    const roomName = document.getElementById('roomName').value.trim();
    const roomDescription = document.getElementById('roomDescription').value.trim();
    const errorDiv = document.getElementById('roomError');
    
    // Clear previous errors
    errorDiv.style.display = 'none';
    
    try {
        const newRoom = window.roomManager.createRoom(roomName, roomDescription);
        
        // Close modal
        closeNewRoomModal();
        
        // Refresh rooms list
        window.roomManager.renderRoomsList('roomsList', newRoom.id);
        
        // Switch to new room
        switchRoom(newRoom.id);
        
        // Show success message
        showToast(`Room "${roomName}" created successfully!`, 'success');
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function deleteRoom(roomId) {
    const room = window.roomManager.getRoom(roomId);
    if (!room) return;
    
    if (confirm(`Are you sure you want to delete the "${room.name}" room? This action cannot be undone.`)) {
        try {
            window.roomManager.deleteRoom(roomId);
            
            // Refresh rooms list
            window.roomManager.renderRoomsList('roomsList', 'general');
            
            // Switch to general room if we're deleting the current room
            if (roomId === window.roomManager.currentRoom) {
                switchRoom('general');
            }
            
            showToast(`Room "${room.name}" deleted successfully!`, 'success');
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .delete-room-btn {
        background: var(--error);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        margin-left: 0.5rem;
        transition: all 0.2s ease;
    }
    
    .delete-room-btn:hover {
        background: #dc2626;
        transform: scale(1.1);
    }
    
    .room-stats {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);

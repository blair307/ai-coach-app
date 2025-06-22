// Community Chat Functionality
class CommunityChat {
    constructor() {
        this.currentRoom = 'general';
        this.currentUser = this.getCurrentUser();
        this.messages = this.loadMessages();
        this.rooms = this.getRooms();
        this.members = this.getMembers();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRoom(this.currentRoom);
        this.updateOnlineCount();
        this.updateBranding();
    }

    updateBranding() {
        // Update all instances of "AI Coach" to "EEH"
        const brandElements = document.querySelectorAll('.sidebar-header h2');
        brandElements.forEach(el => {
            if (el.textContent === 'AI Coach') {
                el.textContent = 'EEH';
            }
        });

        // Update page title
        document.title = 'Community - Entrepreneur Emotional Health';
    }

    setupEventListeners() {
        // Message input handling
        const messageInput = document.getElementById('communityMessageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button
        const sendButton = document.getElementById('sendCommunityButton');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }

        // Auto-resize textarea
        if (messageInput) {
            messageInput.addEventListener('input', this.autoResizeTextarea);
        }
    }

    autoResizeTextarea(e) {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }

    getCurrentUser() {
        // In a real app, this would come from authentication
        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            name: 'Current User',
            avatar: this.generateAvatar('Current User'),
            online: true
        };
    }

    generateAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        return initials.substring(0, 2);
    }

    getRooms() {
        return {
            'general': {
                name: 'General Discussion',
                description: 'Open chat for everyone to discuss anything',
                members: 24,
                unread: 3
            },
            'emotional-wellness': {
                name: 'Emotional Wellness',
                description: 'Mental health & emotional intelligence',
                members: 18,
                unread: 0
            },
            'business-growth': {
                name: 'Business Growth',
                description: 'Scaling strategies & challenges',
                members: 31,
                unread: 1
            },
            'success-stories': {
                name: 'Success Stories',
                description: 'Celebrate your wins & breakthroughs',
                members: 15,
                unread: 0
            },
            'work-life-balance': {
                name: 'Work-Life Balance',
                description: 'Managing entrepreneurial stress',
                members: 22,
                unread: 0
            }
        };
    }

    getMembers() {
        return {
            'general': [
                { id: '1', name: 'Sarah Johnson', avatar: 'SJ', online: true },
                { id: '2', name: 'Mike Chen', avatar: 'MC', online: true },
                { id: '3', name: 'Alex Rivera', avatar: 'AR', online: false, lastSeen: '2h ago' },
                { id: '4', name: 'Emma Davis', avatar: 'ED', online: true },
                { id: '5', name: 'James Wilson', avatar: 'JW', online: false, lastSeen: '1d ago' }
            ]
        };
    }

    loadMessages() {
        // Sample messages for different rooms
        return {
            'general': [
                {
                    id: '1',
                    user: { name: 'Sarah Johnson', avatar: 'SJ' },
                    content: 'Just finished my first week with the AI coach! Feeling so motivated and clear about my goals.',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
                },
                {
                    id: '2',
                    user: { name: 'Mike Chen', avatar: 'MC' },
                    content: 'That\'s awesome Sarah! What was your biggest breakthrough?',
                    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000) // 1.5 hours ago
                },
                {
                    id: '3',
                    user: { name: 'Sarah Johnson', avatar: 'SJ' },
                    content: 'Realizing that I was setting too many goals at once. The AI helped me prioritize and focus on just 2-3 key areas. Game changer!',
                    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
                }
            ],
            'emotional-wellness': [
                {
                    id: '1',
                    user: { name: 'Emma Davis', avatar: 'ED' },
                    content: 'Been working on emotional regulation techniques. Meditation has been a game changer for managing stress.',
                    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
                }
            ],
            'business-growth': [
                {
                    id: '1',
                    user: { name: 'James Wilson', avatar: 'JW' },
                    content: 'Anyone else struggling with scaling their team? Looking for advice on hiring practices.',
                    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
                }
            ]
        };
    }

    switchRoom(roomId) {
        // Remove active class from all room items
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected room
        const roomElement = document.querySelector(`[data-room="${roomId}"]`);
        if (roomElement) {
            roomElement.classList.add('active');
        }

        this.currentRoom = roomId;
        this.loadRoom(roomId);
    }

    loadRoom(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;

        // Update room header
        document.getElementById('currentRoomName').textContent = room.name;
        document.getElementById('currentRoomDescription').textContent = room.description;
        document.getElementById('roomMemberCount').textContent = room.members;

        // Load messages for this room
        this.displayMessages(roomId);

        // Clear unread count for this room
        const roomElement = document.querySelector(`[data-room="${roomId}"]`);
        const unreadBadge = roomElement?.querySelector('.unread-count');
        if (unreadBadge) {
            unreadBadge.remove();
        }

        // Update room object
        this.rooms[roomId].unread = 0;
    }

    displayMessages(roomId) {
        const messagesContainer = document.getElementById('communityMessages');
        if (!messagesContainer) return;

        const roomMessages = this.messages[roomId] || [];
        
        messagesContainer.innerHTML = '';

        roomMessages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';

        const timestamp = this.formatTimestamp(message.timestamp);
        
        messageGroup.innerHTML = `
            <div class="message-header">
                <div class="user-avatar">${message.user.avatar}</div>
                <span class="username">${message.user.name}</span>
                <span class="message-timestamp">${timestamp}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.content)}
            </div>
        `;

        return messageGroup;
    }

    sendMessage() {
        const messageInput = document.getElementById('communityMessageInput');
        const content = messageInput.value.trim();

        if (!content) return;

        const message = {
            id: Date.now().toString(),
            user: this.currentUser,
            content: content,
            timestamp: new Date()
        };

        // Add message to current room
        if (!this.messages[this.currentRoom]) {
            this.messages[this.currentRoom] = [];
        }
        this.messages[this.currentRoom].push(message);

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Refresh display
        this.displayMessages(this.currentRoom);

        // In a real app, you would send this to the server
        console.log('Message sent:', message);
    }

    toggleMembersList() {
        const membersList = document.getElementById('membersList');
        if (membersList) {
            const isVisible = membersList.style.display !== 'none';
            membersList.style.display = isVisible ? 'none' : 'block';
        }
    }

    addEmoji() {
        const emojiModal = document.getElementById('emojiModal');
        if (emojiModal) {
            const isVisible = emojiModal.style.display !== 'none';
            emojiModal.style.display = isVisible ? 'none' : 'block';
        }
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('communityMessageInput');
        if (messageInput) {
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(cursorPos);
            
            messageInput.value = textBefore + emoji + textAfter;
            messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
            messageInput.focus();
        }

        // Hide emoji modal
        const emojiModal = document.getElementById('emojiModal');
        if (emojiModal) {
            emojiModal.style.display = 'none';
        }
    }

    createRoom() {
        const roomName = prompt('Enter room name:');
        if (!roomName) return;

        const roomId = roomName.toLowerCase().replace(/\s+/g, '-');
        
        // Check if room already exists
        if (this.rooms[roomId]) {
            alert('Room already exists!');
            return;
        }

        // Create new room
        this.rooms[roomId] = {
            name: roomName,
            description: 'User created room',
            members: 1,
            unread: 0
        };

        this.messages[roomId] = [];

        // Add room to sidebar
        this.updateRoomsList();

        // Switch to new room
        this.switchRoom(roomId);
    }

    updateRoomsList() {
        const roomsList = document.getElementById('roomsList');
        if (!roomsList) return;

        roomsList.innerHTML = '';

        Object.entries(this.rooms).forEach(([roomId, room]) => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.setAttribute('data-room', roomId);
            roomElement.onclick = () => this.switchRoom(roomId);

            if (roomId === this.currentRoom) {
                roomElement.classList.add('active');
            }

            const unreadBadge = room.unread > 0 ? 
                `<span class="unread-count">${room.unread}</span>` : '';

            roomElement.innerHTML = `
                <div class="room-info">
                    <h4>${room.name}</h4>
                    <p>${room.description}</p>
                </div>
                <div class="room-stats">
                    <span class="member-count">${room.members}</span>
                    ${unreadBadge}
                </div>
            `;

            roomsList.appendChild(roomElement);
        });
    }

    updateOnlineCount() {
        const onlineCount = Math.floor(Math.random() * 20) + 5; // Simulate online users
        const onlineCountElement = document.getElementById('onlineCount');
        if (onlineCountElement) {
            onlineCountElement.textContent = onlineCount;
        }
    }

    formatTimestamp(date) {
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const minutes = Math.floor(diffInHours * 60);
            return `${minutes}m ago`;
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return `${hours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // In a real app, this would clear session and redirect
            window.location.href = 'index.html';
        }
    }
}

// Global functions for HTML onclick handlers
function switchRoom(roomId) {
    if (window.communityChat) {
        window.communityChat.switchRoom(roomId);
    }
}

function toggleMembersList() {
    if (window.communityChat) {
        window.communityChat.toggleMembersList();
    }
}

function addEmoji() {
    if (window.communityChat) {
        window.communityChat.addEmoji();
    }
}

function insertEmoji(emoji) {
    if (window.communityChat) {
        window.communityChat.insertEmoji(emoji);
    }
}

function createRoom() {
    if (window.communityChat) {
        window.communityChat.createRoom();
    }
}

function logout() {
    if (window.communityChat) {
        window.communityChat.logout();
    }
}

function handleCommunityKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (window.communityChat) {
            window.communityChat.sendMessage();
        }
    }
}

function sendCommunityMessage() {
    if (window.communityChat) {
        window.communityChat.sendMessage();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.communityChat = new CommunityChat();
});

// Close emoji modal when clicking outside
document.addEventListener('click', function(event) {
    const emojiModal = document.getElementById('emojiModal');
    const emojiButton = event.target.closest('[onclick*="addEmoji"]');
    
    if (emojiModal && !emojiModal.contains(event.target) && !emojiButton) {
        emojiModal.style.display = 'none';
    }
});

// Close members list when clicking outside
document.addEventListener('click', function(event) {
    const membersList = document.getElementById('membersList');
    const membersButton = event.target.closest('[onclick*="toggleMembersList"]');
    
    if (membersList && membersList.style.display !== 'none' && 
        !membersList.contains(event.target) && !membersButton) {
        membersList.style.display = 'none';
    }
});

// Enhanced Community.js - With Visual Reply System + Notifications

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
let currentRoomId = null;
let currentRoomName = 'General Discussion';
let currentUser = null;
let rooms = [];
let isInitialized = false;
let currentReplyTo = null;

// Initialize community when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Community with Reply System loading...');
    
    // FORCE HIDE modals immediately on page load
    setTimeout(() => {
        const searchResults = document.getElementById('searchResults');
        const emojiModal = document.getElementById('emojiModal');
        
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.style.visibility = 'hidden';
        }
        
        if (emojiModal) {
            emojiModal.style.display = 'none';
            emojiModal.style.visibility = 'hidden';
        }
    }, 50);
    
    hideLoadingOverlay();
    
    setTimeout(() => {
        initializeCommunity();
    }, 100);
});

// ENHANCED: Create message element with visual reply styling
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-group';
    messageDiv.setAttribute('data-message-id', message._id || message.id || Date.now());
    
    // VISUAL DISTINCTION: Add reply class if this is a reply
    if (message.replyTo) {
        messageDiv.classList.add('reply-message');
        messageDiv.setAttribute('data-reply-to', message.replyTo.messageId);
        console.log('💬 Creating reply message visual styling');
    }

    const username = message.username || 'User';
    const userInitials = username.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const timestamp = formatMessageTime(message.createdAt || message.timestamp);
    const content = message.content || message.message || '';
    
    // ENHANCED: Reply reference with better styling
    let replyHtml = '';
    if (message.replyTo) {
        replyHtml = `
            <div class="reply-reference">
                <div class="reply-author">↳ Replying to ${escapeHtml(message.replyTo.username)}</div>
                <div class="reply-text">${escapeHtml(message.replyTo.content)}</div>
            </div>
        `;
    }
    
    // Simulate like count (in real app, this would come from backend)
    const likes = message.likes || [];
    const likeCount = likes.length || Math.floor(Math.random() * 3);
    const isLikedByUser = likes.includes(currentUser?.id);
    const hasLikes = likeCount > 0;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="user-avatar" style="background-color: ${message.avatarColor || '#6366f1'}">
                ${userInitials}
            </div>
            <span class="username">${escapeHtml(username)}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-content">
            ${replyHtml}
            <p>${escapeHtml(content)}</p>
            <div class="message-actions">
                <button class="action-btn like-btn ${isLikedByUser ? 'liked' : ''}" 
                        onclick="toggleLike('${message._id || message.id || Date.now()}')" 
                        title="Like">
                    ${isLikedByUser ? '♥' : '♡'}
                </button>
                <button class="action-btn reply-btn" 
                        onclick="replyToMessage('${message._id || message.id || Date.now()}', '${escapeHtml(username)}', '${escapeHtml(content)}', '${message.userId || ''}')" 
                        title="Reply">
                    ↳
                </button>
            </div>
        </div>
        <div class="message-footer">
            <div class="like-count ${hasLikes ? 'has-likes' : ''}" 
                 data-count="${likeCount}" 
                 style="display: ${hasLikes ? 'flex' : 'none'}">
                ${hasLikes ? `♥ ${likeCount}` : ''}
            </div>
        </div>
    `;

    return messageDiv;
}

// ENHANCED: Reply functionality with notification creation
function replyToMessage(messageId, username, content, originalUserId) {
    currentReplyTo = { 
        messageId, 
        username, 
        content,
        userId: originalUserId // Store original user ID for notifications
    };
    
    console.log('💬 Replying to message:', { messageId, username, originalUserId });
    
    // Show reply banner
    const replyBanner = document.getElementById('replyBanner');
    const replyToUser = document.getElementById('replyToUser');
    const replyToMessage = document.getElementById('replyToMessage');
    const chatInput = document.querySelector('.chat-input');
    
    if (replyBanner && replyToUser && replyToMessage && chatInput) {
        replyToUser.textContent = username;
        replyToMessage.textContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        
        replyBanner.style.display = 'block';
        chatInput.classList.add('replying');
        
        // Focus the input
        const messageInput = document.getElementById('communityMessageInput');
        if (messageInput) {
            messageInput.focus();
        }
        
        // Show reply toast
        showReplyToast(`Replying to ${username}`);
        
        // Add haptic feedback on mobile
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(50);
        }
        
        console.log('✅ Reply banner shown and focused');
    }
}

// NEW: Reply toast notification
function showReplyToast(message) {
    const toast = document.createElement('div');
    toast.className = 'reply-toast';
    toast.innerHTML = `💬 ${message}`;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ENHANCED: Send message with reply support and notification creation
async function sendCommunityMessage() {
    try {
        const messageInput = document.getElementById('communityMessageInput');
        const sendButton = document.getElementById('sendCommunityButton');
        
        if (!messageInput || !currentRoomId) {
            console.error('❌ Missing required elements or room not selected');
            return;
        }

        const messageText = messageInput.value.trim();
        if (!messageText) {
            return;
        }

        // Show loading state
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
        }

        // Add mobile haptic feedback
        if (navigator.vibrate && window.innerWidth <= 1024) {
            navigator.vibrate(30);
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Prepare message data
        const messageData = {
            content: messageText,
            avatar: currentUser?.name?.substring(0, 2).toUpperCase() || 'U',
            avatarColor: '#6366f1'
        };

        // ENHANCED: Add reply data with user ID for notifications
        if (currentReplyTo) {
            messageData.replyTo = {
                messageId: currentReplyTo.messageId,
                userId: currentReplyTo.userId, // IMPORTANT: Include original user ID
                username: currentReplyTo.username,
                content: currentReplyTo.content
            };
            console.log('📤 Sending reply with notification data:', {
                replyToUserId: currentReplyTo.userId,
                replyToUsername: currentReplyTo.username
            });
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Send message to backend (which will create notification if it's a reply)
        const response = await fetch(`${API_BASE_URL}/api/rooms/${currentRoomId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.status}`);
        }

        const newMessage = await response.json();
        console.log('📤 Message sent successfully:', {
            id: newMessage._id,
            isReply: !!newMessage.replyTo,
            notificationCreated: !!newMessage.replyTo
        });

        // Clear input and reply state
        messageInput.value = '';
        cancelReply();

        // Hide mobile keyboard
        if (window.innerWidth <= 1024) {
            messageInput.blur();
        }

        // Show success feedback for replies
        if (currentReplyTo) {
            showSuccessToast('Reply sent! Notification created.');
        }

        // Reload messages to show the new one
        await loadMessages(currentRoomId);

    } catch (error) {
        console.error('❌ Error sending message:', error);
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

// NEW: Success toast for confirmation
function showSuccessToast(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 100px; left: 20px; right: 20px;' : 'bottom: 100px; right: 20px; max-width: 400px;'}
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = `✅ ${message}`;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ENHANCED: Update notification count with reply indicators
async function updateNotificationCount() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const totalCount = data.count || 0;
            const replyCount = data.replyCount || 0;
            const hasReplies = data.hasReplies || false;
            
            const countElement = document.getElementById('headerNotificationCount');
            
            if (countElement) {
                countElement.textContent = totalCount;
                countElement.setAttribute('data-count', totalCount);
                countElement.style.display = totalCount > 0 ? 'flex' : 'none';
                
                // ENHANCED: Special styling for reply notifications
                if (hasReplies) {
                    countElement.classList.add('has-replies');
                    countElement.style.background = 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)';
                } else {
                    countElement.classList.remove('has-replies');
                    countElement.style.background = '#ef4444';
                }
            }
            
            console.log('🔔 Notification count updated:', { total: totalCount, replies: replyCount });
        }
    } catch (error) {
        console.error('❌ Error fetching notification count:', error);
    }
}

// Load messages with enhanced reply processing
async function loadMessages(roomId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) {
            throw new Error('No authentication token');
        }

        console.log('📨 Loading messages for room:', roomId);

        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <p>Loading messages...</p>
                </div>
            `;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to load messages: ${response.status}`);
        }

        const messages = await response.json();
        console.log('💬 Loaded messages for room:', roomId, {
            total: messages.length,
            replies: messages.filter(m => m.replyTo).length
        });
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        displayMessages([]);
    }
}

// Display messages with enhanced reply styling
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

    // Process and display messages
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Log reply statistics
    const replyCount = messages.filter(m => m.replyTo).length;
    console.log(`📊 Displayed ${messages.length} messages (${replyCount} replies)`);
}

// Keep all existing functions from original community.js
function cancelReply() {
    currentReplyTo = null;
    
    const replyBanner = document.getElementById('replyBanner');
    const chatInput = document.querySelector('.chat-input');
    
    if (replyBanner) {
        replyBanner.style.display = 'none';
    }
    
    if (chatInput) {
        chatInput.classList.remove('replying');
    }
    
    console.log('✅ Reply cancelled');
}

function getCurrentUser() {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        if (!token) return null;
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.userId,
            email: payload.email,
            name: localStorage.getItem('userName') || 'User'
        };
    } catch (error) {
        return null;
    }
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    const isMobile = window.innerWidth <= 1024;
    
    toast.style.cssText = `
        position: fixed;
        ${isMobile ? 'bottom: 20px; left: 20px; right: 20px;' : 'bottom: 20px; right: 20px; max-width: 400px;'}
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Initialize when DOM ready
async function initializeCommunity() {
    try {
        if (isInitialized) {
            console.log('⚠️ Community already initialized, skipping...');
            return;
        }

        console.log('🚀 Starting enhanced community with reply system...');
        
        currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('❌ No user found');
            showCommunityError('Please log in to access the community.');
            return;
        }

        console.log('✅ User found:', currentUser.email);
        setLayoutForScreenSize();

        const messagesContainer = document.getElementById('communityMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <p>Loading rooms...</p>
                </div>
            `;
        }

        const roomsLoaded = await loadRooms();
        
        if (!roomsLoaded) {
            console.error('❌ Failed to load rooms');
            showCommunityError('Unable to load chat rooms. Please check your connection and try again.');
            return;
        }

        const generalRoom = rooms.find(room => room.name === 'General Discussion') || rooms[0];
        if (generalRoom) {
            currentRoomId = generalRoom._id;
            currentRoomName = generalRoom.name;
            console.log('🏠 Setting default room:', currentRoomName);
            await switchRoom(generalRoom._id);
        }

        isInitialized = true;
        console.log('✅ Enhanced community with reply system initialized successfully');
        
        // Update notification count immediately and then every 30 seconds
        updateNotificationCount();
        setInterval(updateNotificationCount, 30000);
        
    } catch (error) {
        console.error('❌ Error initializing community:', error);
        showCommunityError('Failed to initialize community. Please refresh the page or try again later.');
    }
}

// Export all necessary functions (keeping original exports + new ones)
window.initializeCommunity = initializeCommunity;
window.sendCommunityMessage = sendCommunityMessage;
window.loadMessages = loadMessages;
window.displayMessages = displayMessages;
window.createMessageElement = createMessageElement;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.updateNotificationCount = updateNotificationCount;
window.showReplyToast = showReplyToast;
window.showSuccessToast = showSuccessToast;

console.log('✅ Enhanced Community.js loaded - Reply System with Visual Styling + Notifications!');

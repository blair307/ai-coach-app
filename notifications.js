/**
 * Notification System - Properly integrates with backend API
 * Add this to your notifications.html page or create notifications.js
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.baseURL = 'https://api.eehcommunity.com/api';
        this.token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
        
        if (!this.token) {
            console.error('No auth token found');
            window.location.href = 'login.html';
            return;
        }
        
        this.currentFilter = 'all';
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing NotificationManager...');
        await this.loadNotifications();
        this.renderNotifications();
        this.updateFilters();
        this.startPeriodicUpdates();
    }
    
    // Get authorization headers
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    // Load notifications from backend
    async loadNotifications() {
        try {
            console.log('📡 Loading notifications from backend...');
            const response = await fetch(`${this.baseURL}/notifications`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.notifications = await response.json();
            console.log('✅ Loaded notifications:', this.notifications.length);
            
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            this.notifications = [];
        }
    }
    
    // Get unread count for header badge
    async getUnreadCount() {
        try {
            const response = await fetch(`${this.baseURL}/notifications/unread-count`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.count || 0;
            
        } catch (error) {
            console.error('❌ Error getting unread count:', error);
            return 0;
        }
    }
    
    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            console.log('📖 Marking notification as read:', notificationId);
            const response = await fetch(`${this.baseURL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Update local notification
            const notification = this.notifications.find(n => n._id === notificationId);
            if (notification) {
                notification.read = true;
            }
            
            console.log('✅ Notification marked as read');
            
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }
    
    // Delete notification
    async deleteNotification(notificationId) {
        try {
            console.log('🗑️ Deleting notification:', notificationId);
            const response = await fetch(`${this.baseURL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Remove from local array
            this.notifications = this.notifications.filter(n => n._id !== notificationId);
            
            console.log('✅ Notification deleted');
            
        } catch (error) {
            console.error('❌ Error deleting notification:', error);
        }
    }
    
    // Filter notifications
    getFilteredNotifications() {
        switch (this.currentFilter) {
            case 'unread':
                return this.notifications.filter(n => !n.read);
            case 'coaching':
                return this.notifications.filter(n => n.type === 'coaching');
            case 'community':
                return this.notifications.filter(n => n.type === 'community');
            case 'system':
                return this.notifications.filter(n => n.type === 'system');
            case 'billing':
                return this.notifications.filter(n => n.type === 'billing');
            default:
                return this.notifications;
        }
    }
    
    // Update filter counts
    updateFilters() {
        const counts = {
            all: this.notifications.length,
            unread: this.notifications.filter(n => !n.read).length,
            coaching: this.notifications.filter(n => n.type === 'coaching').length,
            community: this.notifications.filter(n => n.type === 'community').length,
            system: this.notifications.filter(n => n.type === 'system').length,
            billing: this.notifications.filter(n => n.type === 'billing').length
        };
        
        // Update filter button counts
        Object.keys(counts).forEach(filter => {
            const button = document.querySelector(`[data-filter="${filter}"]`);
            if (button) {
                const countSpan = button.querySelector('.count');
                if (countSpan && counts[filter] > 0) {
                    countSpan.textContent = counts[filter];
                    countSpan.style.display = 'inline';
                } else if (countSpan) {
                    countSpan.style.display = 'none';
                }
            }
        });
    }
    
    // Render notifications in UI
    renderNotifications() {
        const container = document.getElementById('notificationsList') || document.querySelector('.notifications-list');
        if (!container) {
            console.error('Notifications container not found');
            return;
        }
        
        const filtered = this.getFilteredNotifications();
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 data-id="${notification._id}">
                <div class="notification-content">
                    <div class="notification-header">
                        <h3>${notification.title}</h3>
                        <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
                    </div>
                    <p>${notification.content}</p>
                    <div class="notification-actions">
                        ${!notification.read ? `<button class="btn-link" onclick="markNotificationAsRead('${notification._id}')">Mark as Read</button>` : ''}
                        <button class="btn-link" onclick="deleteNotification('${notification._id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Set filter
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Re-render notifications
        this.renderNotifications();
    }
    
    // Start periodic updates for notification counts
    startPeriodicUpdates() {
        setInterval(async () => {
            await this.updateHeaderNotificationCount();
        }, 30000); // Update every 30 seconds
    }
    
    // Update header notification count
    async updateHeaderNotificationCount() {
        try {
            const count = await this.getUnreadCount();
            const countElements = document.querySelectorAll('#headerNotificationCount, .notification-count');
            
            countElements.forEach(element => {
                if (element) {
                    element.textContent = count;
                    element.setAttribute('data-count', count);
                    element.style.display = count > 0 ? 'flex' : 'none';
                }
            });
            
        } catch (error) {
            console.error('Error updating header notification count:', error);
        }
    }
}

// Initialize notification manager
let notificationManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Notification system initializing...');
    
    // Initialize notification manager
    notificationManager = new NotificationManager();
    
    // Export to global scope for HTML onclick handlers
    window.notificationManager = notificationManager;
    
    // Attach filter button handlers
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            notificationManager.setFilter(filter);
        });
    });
    
    console.log('✅ Notification system ready');
});

// Global functions for HTML onclick handlers
window.markNotificationAsRead = async function(notificationId) {
    if (!notificationManager) {
        console.error('NotificationManager not initialized');
        return;
    }
    
    try {
        await notificationManager.markAsRead(notificationId);
        notificationManager.renderNotifications();
        notificationManager.updateFilters();
        await notificationManager.updateHeaderNotificationCount();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

window.deleteNotification = async function(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    if (!notificationManager) {
        console.error('NotificationManager not initialized');
        return;
    }
    
    try {
        await notificationManager.deleteNotification(notificationId);
        notificationManager.renderNotifications();
        notificationManager.updateFilters();
        await notificationManager.updateHeaderNotificationCount();
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
};

// Update notification count function (for use in other pages)
window.updateNotificationCount = async function() {
    if (!notificationManager) {
        // Create a simple version for pages without full notification manager
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('authToken');
            if (!token) return;
            
            const response = await fetch('https://api.eehcommunity.com/api/notifications/unread-count', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const count = data.count || 0;
                const countElements = document.querySelectorAll('#headerNotificationCount, .notification-count');
                
                countElements.forEach(element => {
                    if (element) {
                        element.textContent = count;
                        element.setAttribute('data-count', count);
                        element.style.display = count > 0 ? 'flex' : 'none';
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching notification count:', error);
        }
    } else {
        await notificationManager.updateHeaderNotificationCount();
    }
};

// Add this JavaScript to your notifications.html or notifications.js

// Enhanced notification click handler
function handleNotificationClick(notificationItem, event) {
    // Don't navigate if clicking on action buttons
    if (event.target.closest('.notification-actions')) {
        return;
    }
    
    const notificationId = notificationItem.dataset.id;
    const notificationType = notificationItem.dataset.type;
    
    // Mark as read when clicked (if unread)
    if (notificationItem.classList.contains('unread')) {
        markAsRead(notificationItem.querySelector('button[onclick*="markAsRead"]'));
    }
    
    // Navigate based on notification type and content
    navigateFromNotification(notificationItem, notificationType);
}

// Navigation logic based on notification type and content
function navigateFromNotification(notificationItem, type) {
    const title = notificationItem.querySelector('h3').textContent.toLowerCase();
    const content = notificationItem.querySelector('p').textContent.toLowerCase();
    
    // Determine destination based on type and keywords
    let destination = 'dashboard.html'; // Default fallback
    
    switch (type) {
        case 'coaching':
            if (title.includes('insight') || content.includes('coaching')) {
                destination = 'ai-coach.html';
            } else if (title.includes('goal') || content.includes('goal')) {
                destination = 'goals.html';
            } else {
                destination = 'ai-coach.html';
            }
            break;
            
        case 'community':
            destination = 'community.html';
            break;
            
        case 'system':
            if (title.includes('report') || content.includes('progress')) {
                destination = 'dashboard.html';
            } else if (title.includes('feature') || title.includes('update')) {
                destination = 'dashboard.html';
            } else {
                destination = 'dashboard.html';
            }
            break;
            
        case 'billing':
            destination = 'billing.html';
            break;
            
        case 'goals':
            destination = 'goals.html';
            break;
            
        case 'daily-prompt':
            destination = 'daily-prompt.html';
            break;
            
        case 'daily-tracker':
            destination = 'daily-tracker.html';
            break;
            
        default:
            // Try to determine from content keywords
            if (content.includes('goal') || title.includes('goal')) {
                destination = 'goals.html';
            } else if (content.includes('prompt') || title.includes('prompt')) {
                destination = 'daily-prompt.html';
            } else if (content.includes('tracker') || title.includes('tracker')) {
                destination = 'daily-tracker.html';
            } else if (content.includes('community') || content.includes('room')) {
                destination = 'community.html';
            } else if (content.includes('coaching') || content.includes('coach')) {
                destination = 'ai-coach.html';
            }
            break;
    }
    
    console.log(`🔗 Navigating from ${type} notification to:`, destination);
    window.location.href = destination;
}

// Enhanced CSS for clickable notifications
const clickableNotificationStyles = `
<style>
/* Make notifications clickable with hover effects */
.notification-item {
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    border-left: 3px solid transparent !important;
}

.notification-item:hover {
    background: rgba(99, 102, 241, 0.05) !important;
    border-left-color: var(--primary) !important;
    transform: translateX(4px) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.notification-item.unread:hover {
    background: rgba(99, 102, 241, 0.08) !important;
}

/* Action buttons should not trigger navigation */
.notification-actions {
    position: relative !important;
    z-index: 2 !important;
}

.notification-actions button {
    pointer-events: auto !important;
}

/* Visual indication that notifications are clickable */
.notification-item::after {
    content: '→' !important;
    position: absolute !important;
    right: 1rem !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    opacity: 0 !important;
    transition: opacity 0.2s ease !important;
    color: var(--primary) !important;
    font-weight: bold !important;
    font-size: 1.2rem !important;
}

.notification-item:hover::after {
    opacity: 1 !important;
}

/* Mobile touch optimization */
@media (max-width: 768px) {
    .notification-item {
        min-height: 80px !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: rgba(99, 102, 241, 0.2) !important;
    }
    
    .notification-item::after {
        opacity: 0.3 !important; /* Always show arrow on mobile */
    }
    
    .notification-item:hover::after {
        opacity: 0.6 !important;
    }
}
</style>
`;

// Initialize clickable notifications
function initializeClickableNotifications() {
    // Add the CSS styles
    document.head.insertAdjacentHTML('beforeend', clickableNotificationStyles);
    
    // Add click handlers to all notification items
    document.addEventListener('click', function(event) {
        const notificationItem = event.target.closest('.notification-item');
        if (notificationItem) {
            handleNotificationClick(notificationItem, event);
        }
    });
    
    console.log('✅ Clickable notifications initialized');
}

// Enhanced notification rendering for NotificationManager
function enhancedRenderNotifications() {
    if (!window.notificationManager) return;
    
    const container = document.getElementById('notificationsList') || document.querySelector('.notifications-list');
    if (!container) return;
    
    const filtered = window.notificationManager.getFilteredNotifications();
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
             data-id="${notification._id}"
             data-type="${notification.type}"
             title="Click to navigate to ${getDestinationName(notification.type)}">
            <div class="notification-icon ${notification.type}">
                <div class="icon-text">${getIconText(notification.type)}</div>
            </div>
            <div class="notification-content">
                <div class="notification-header">
                    <h3>${notification.title}</h3>
                    <span class="notification-time">${window.notificationManager.formatTime(notification.createdAt)}</span>
                </div>
                <p>${notification.content}</p>
                <div class="notification-actions">
                    ${!notification.read ? `<button class="btn-link" onclick="event.stopPropagation(); markNotificationAsRead('${notification._id}')">Mark as Read</button>` : ''}
                    <button class="btn-link" onclick="event.stopPropagation(); deleteNotification('${notification._id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper functions
function getIconText(type) {
    const icons = {
        coaching: 'AI',
        community: 'CM',
        system: 'SY',
        billing: 'BI',
        goals: 'GL',
        'daily-prompt': 'DP',
        'daily-tracker': 'DT'
    };
    return icons[type] || 'SY';
}

function getDestinationName(type) {
    const destinations = {
        coaching: 'AI Coach',
        community: 'Community',
        system: 'Dashboard',
        billing: 'Billing',
        goals: 'Goals',
        'daily-prompt': 'Daily Prompt',
        'daily-tracker': 'Daily Tracker'
    };
    return destinations[type] || 'Dashboard';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to load
    setTimeout(initializeClickableNotifications, 1000);
    
    // Override the notification manager's render function if it exists
    if (window.notificationManager && window.notificationManager.renderNotifications) {
        window.notificationManager.renderNotifications = enhancedRenderNotifications;
    }
});

// Export for use in other scripts
window.initializeClickableNotifications = initializeClickableNotifications;
window.handleNotificationClick = handleNotificationClick;

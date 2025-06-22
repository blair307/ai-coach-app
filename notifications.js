/**
 * Notification System - Properly integrates with backend API
 * Add this to your notifications.html page or create notifications.js
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.baseURL = 'https://ai-coach-backend-mytn.onrender.com/api';
        this.token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        
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
            const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
            if (!token) return;
            
            const response = await fetch('https://ai-coach-backend-mytn.onrender.com/api/notifications/unread-count', {
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

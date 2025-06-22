// notification-manager.js
// Global notification badge management system

class NotificationManager {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.initialized = false;
    }

    // Initialize the notification system
    init() {
        if (this.initialized) return;
        
        // Load notifications from localStorage or API
        this.loadNotifications();
        this.updateBadge();
        this.initialized = true;
        
        console.log('Notification Manager initialized with', this.unreadCount, 'unread notifications');
    }

    // Load notifications (from localStorage for demo, could be from API)
    loadNotifications() {
        // Try to get from localStorage first
        const saved = localStorage.getItem('eeh_notifications');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.notifications = data.notifications || [];
                this.unreadCount = data.unreadCount || 0;
                return;
            } catch (e) {
                console.log('Error loading saved notifications:', e);
            }
        }

        // Default notifications if none saved
        this.notifications = [
            {
                id: 1,
                type: 'coaching',
                title: 'New Coaching Insights Available',
                message: 'Your AI coach has generated new insights based on your recent conversations.',
                time: '2 hours ago',
                unread: true,
                timestamp: Date.now() - (2 * 60 * 60 * 1000)
            },
            {
                id: 2,
                type: 'community',
                title: 'New Messages in Business Growth',
                message: 'Sarah Johnson and 3 others have shared new insights in the Business Growth room.',
                time: '4 hours ago',
                unread: true,
                timestamp: Date.now() - (4 * 60 * 60 * 1000)
            },
            {
                id: 3,
                type: 'system',
                title: 'Weekly Progress Report Ready',
                message: 'Your weekly emotional health and business progress report is now available.',
                time: '1 day ago',
                unread: true,
                timestamp: Date.now() - (24 * 60 * 60 * 1000)
            }
        ];

        this.unreadCount = this.notifications.filter(n => n.unread).length;
        this.saveNotifications();
    }

    // Save notifications to localStorage
    saveNotifications() {
        const data = {
            notifications: this.notifications,
            unreadCount: this.unreadCount,
            lastUpdated: Date.now()
        };
        localStorage.setItem('eeh_notifications', JSON.stringify(data));
    }

    // Update the badge on all pages
    updateBadge() {
        const badges = document.querySelectorAll('#notificationBadge, .notification-badge');
        badges.forEach(badge => {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    // Add a new notification
    addNotification(notification) {
        const newNotification = {
            id: Date.now(),
            unread: true,
            timestamp: Date.now(),
            ...notification
        };
        
        this.notifications.unshift(newNotification);
        this.unreadCount++;
        this.saveNotifications();
        this.updateBadge();
        
        console.log('New notification added:', newNotification.title);
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.unread) {
            notification.unread = false;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.saveNotifications();
            this.updateBadge();
        }
    }

    // Mark all notifications as read
    markAllAsRead() {
        this.notifications.forEach(n => n.unread = false);
        this.unreadCount = 0;
        this.saveNotifications();
        this.updateBadge();
    }

    // Get unread count
    getUnreadCount() {
        return this.unreadCount;
    }

    // Get all notifications
    getNotifications() {
        return this.notifications;
    }
}

// Create global instance
window.notificationManager = new NotificationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager.init();
});

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}

// notification-manager.js
// Fixed Global notification badge management system

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
                // Always recalculate unread count from actual data
                this.unreadCount = this.notifications.filter(n => n.unread).length;
                console.log('Loaded', this.notifications.length, 'notifications,', this.unreadCount, 'unread');
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
                message: 'Your AI coach has generated new insights based on your recent conversations. Review your personalized recommendations for emotional wellness and business growth.',
                time: '2 hours ago',
                unread: true,
                timestamp: Date.now() - (2 * 60 * 60 * 1000)
            },
            {
                id: 2,
                type: 'community',
                title: 'New Messages in Business Growth',
                message: 'Sarah Johnson and 3 others have shared new insights in the Business Growth room. Join the conversation about scaling strategies.',
                time: '4 hours ago',
                unread: true,
                timestamp: Date.now() - (4 * 60 * 60 * 1000)
            },
            {
                id: 3,
                type: 'system',
                title: 'Weekly Progress Report Ready',
                message: 'Your weekly emotional health and business progress report is now available. See your growth patterns and achievements.',
                time: '1 day ago',
                unread: true,
                timestamp: Date.now() - (24 * 60 * 60 * 1000)
            },
            {
                id: 4,
                type: 'coaching',
                title: 'Goal Achievement Milestone',
                message: 'Congratulations! You\'ve completed 75% of your quarterly emotional wellness goals. Your AI coach has updated your action plan.',
                time: '2 days ago',
                unread: false,
                timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000)
            },
            {
                id: 5,
                type: 'community',
                title: 'Someone Mentioned You',
                message: 'Mike Chen mentioned you in the Success Stories room. Check out the discussion about overcoming entrepreneurial challenges.',
                time: '3 days ago',
                unread: false,
                timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000)
            },
            {
                id: 6,
                type: 'community',
                title: 'New Room Created: Mindfulness',
                message: 'A new community room "Mindfulness & Meditation" has been created. Join entrepreneurs discussing stress management techniques.',
                time: '4 days ago',
                unread: false,
                timestamp: Date.now() - (4 * 24 * 60 * 60 * 1000)
            },
            {
                id: 7,
                type: 'system',
                title: 'Platform Update: New Features',
                message: 'We\'ve added new emotional intelligence tracking features and enhanced AI coaching capabilities. Explore the improvements in your dashboard.',
                time: '1 week ago',
                unread: false,
                timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000)
            },
            {
                id: 8,
                type: 'billing',
                title: 'Payment Successful',
                message: 'Your yearly subscription payment of $929 has been processed successfully. Thank you for continuing your emotional health journey with us.',
                time: '1 week ago',
                unread: false,
                timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000)
            }
        ];

        // Calculate unread count from default notifications
        this.unreadCount = this.notifications.filter(n => n.unread).length;
        this.saveNotifications();
        console.log('Created default notifications:', this.notifications.length, 'total,', this.unreadCount, 'unread');
    }

    // Save notifications to localStorage
    saveNotifications() {
        // Always recalculate unread count before saving
        this.unreadCount = this.notifications.filter(n => n.unread).length;
        
        const data = {
            notifications: this.notifications,
            unreadCount: this.unreadCount,
            lastUpdated: Date.now()
        };
        localStorage.setItem('eeh_notifications', JSON.stringify(data));
        console.log('Saved notifications:', this.notifications.length, 'total,', this.unreadCount, 'unread');
    }

    // Update the badge on all pages
    updateBadge() {
        // Always recalculate unread count
        this.unreadCount = this.notifications.filter(n => n.unread).length;
        
        const badges = document.querySelectorAll('#notificationBadge, .notification-badge');
        badges.forEach(badge => {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
        
        console.log('Updated badges to show:', this.unreadCount);
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
        this.saveNotifications(); // This will recalculate unreadCount
        this.updateBadge();
        
        console.log('New notification added:', newNotification.title, '| Total unread:', this.unreadCount);
        
        // Trigger custom event for pages that need to refresh
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.unread) {
            notification.unread = false;
            this.saveNotifications(); // This will recalculate unreadCount
            this.updateBadge();
            
            console.log('Marked notification', notificationId, 'as read | Remaining unread:', this.unreadCount);
            
            // Trigger custom event
            window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        }
    }

    // Mark all notifications as read
    markAllAsRead() {
        let changed = false;
        this.notifications.forEach(n => {
            if (n.unread) {
                n.unread = false;
                changed = true;
            }
        });
        
        if (changed) {
            this.saveNotifications(); // This will recalculate unreadCount
            this.updateBadge();
            
            console.log('Marked all notifications as read');
            
            // Trigger custom event
            window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        }
    }

    // Clear all notifications
    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications(); // This will recalculate unreadCount to 0
        this.updateBadge();
        
        console.log('Cleared all notifications');
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    }

    // Get unread count (always recalculate to be safe)
    getUnreadCount() {
        this.unreadCount = this.notifications.filter(n => n.unread).length;
        return this.unreadCount;
    }

    // Get all notifications
    getNotifications() {
        return this.notifications;
    }

    // Force refresh of badge (useful for debugging)
    forceRefresh() {
        this.loadNotifications();
        this.updateBadge();
        console.log('Force refreshed - Unread count:', this.unreadCount);
    }
}

// Create global instance
window.notificationManager = new NotificationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.notificationManager) {
        window.notificationManager.init();
        
        // Force an update after a short delay to ensure DOM is fully ready
        setTimeout(() => {
            window.notificationManager.updateBadge();
        }, 100);
    }
});

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}

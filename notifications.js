// Updated Notifications JavaScript - Real System Integration
class NotificationManager {
    constructor() {
        this.currentFilter = 'all';
        this.realNotificationSystem = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initializeRealNotificationSystem();
        this.setupEventListeners();
        this.updateBranding();
    }

    initializeRealNotificationSystem() {
        // Initialize or get existing real notification system
        if (!window.realNotificationSystem) {
            // Import the notification system if not loaded
            const script = document.createElement('script');
            script.src = 'real-notification-system.js';
            document.head.appendChild(script);
            
            script.onload = () => {
                window.realNotificationSystem = new RealNotificationSystem();
                this.realNotificationSystem = window.realNotificationSystem;
                this.loadNotifications();
                this.updateAllCounts();
            };
        } else {
            this.realNotificationSystem = window.realNotificationSystem;
            this.loadNotifications();
            this.updateAllCounts();
        }
    }

    updateBranding() {
        document.title = 'Notifications - Entrepreneur Emotional Health';
        const brandElements = document.querySelectorAll('.sidebar-header h2');
        brandElements.forEach(el => {
            if (el.textContent === 'AI Coach') {
                el.textContent = 'EEH';
            }
        });
    }

    setupEventListeners() {
        // Handle clicks outside modals
        document.addEventListener('click', (e) => {
            const settingsModal = document.getElementById('settingsModal');
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'a':
                        e.preventDefault();
                        this.markAllRead();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.loadNotifications();
                        break;
                }
            }
        });

        // Auto-refresh notifications every 30 seconds
        setInterval(() => {
            if (this.realNotificationSystem) {
                this.realNotificationSystem.generateNotificationsFromActivity();
                this.loadNotifications();
                this.updateAllCounts();
            }
        }, 30000);
    }

    checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    loadNotifications() {
        if (!this.realNotificationSystem) {
            // Show loading state
            const container = document.getElementById('notificationsList');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        <p>Loading notifications...</p>
                    </div>
                `;
            }
            return;
        }

        // Generate fresh notifications based on current activity
        this.realNotificationSystem.generateNotificationsFromActivity();
        
        this.renderNotifications();
        this.updateAllCounts();
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!container || !this.realNotificationSystem) return;

        const notifications = this.realNotificationSystem.getNotifications();
        const filteredNotifications = this.getFilteredNotifications(notifications);
        
        if (filteredNotifications.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            
            // Show different empty messages based on filter
            const emptyMessage = this.getEmptyStateMessage();
            emptyState.innerHTML = `
                <h3>No ${this.currentFilter === 'all' ? '' : this.currentFilter + ' '}notifications found</h3>
                <p>${emptyMessage}</p>
            `;
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';
        
        container.innerHTML = filteredNotifications.map(notification => 
            this.createNotificationHTML(notification)
        ).join('');
    }

    getEmptyStateMessage() {
        switch(this.currentFilter) {
            case 'unread':
                return "You're all caught up! No unread notifications at the moment.";
            case 'coaching':
                return "Start chatting with your AI coach to receive personalized insights and progress updates.";
            case 'community':
                return "Join community discussions to receive notifications about new messages and mentions.";
            case 'system':
                return "Complete goals and maintain activity streaks to receive system notifications.";
            case 'billing':
                return "Billing notifications will appear here for payment confirmations and subscription updates.";
            default:
                return "Keep using the platform to receive personalized notifications based on your activity!";
        }
    }

    createNotificationHTML(notification) {
        const iconMap = {
            coaching: 'AI',
            community: 'CM',
            system: 'SY',
            billing: 'BI'
        };

        const markAsReadButton = !notification.read ? 
            `<button class="btn-link" onclick="window.notificationManager.markAsRead('${notification.id}')">Mark as Read</button>` : '';

        const actionButton = this.getActionButton(notification);

        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-type="${notification.type}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <div class="icon-text">${iconMap[notification.type] || 'NT'}</div>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h3>${notification.title}</h3>
                        <span class="notification-time">${this.formatTimestamp(notification.timestamp)}</span>
                    </div>
                    <p>${notification.message}</p>
                    <div class="notification-actions">
                        ${actionButton}
                        ${markAsReadButton}
                    </div>
                </div>
            </div>
        `;
    }

    getActionButton(notification) {
        switch(notification.type) {
            case 'coaching':
                return `<button class="btn-link" onclick="window.notificationManager.goToCoach('${notification.id}')">View Insights</button>`;
            case 'community':
                return `<button class="btn-link" onclick="window.notificationManager.goToCommunity('${notification.id}')">Join Conversation</button>`;
            case 'system':
                return `<button class="btn-link" onclick="window.notificationManager.goToDashboard('${notification.id}')">View Details</button>`;
            case 'billing':
                return `<button class="btn-link" onclick="window.notificationManager.goToBilling('${notification.id}')">View Receipt</button>`;
            default:
                return '';
        }
    }

    getFilteredNotifications(notifications) {
        return notifications.filter(notification => {
            switch(this.currentFilter) {
                case 'all':
                    return true;
                case 'unread':
                    return !notification.read;
                default:
                    return notification.type === this.currentFilter;
            }
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    filterNotifications(type) {
        this.currentFilter = type;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the correct button
        const targetButton = Array.from(document.querySelectorAll('.filter-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(type.toLowerCase()) || 
            (type === 'all' && btn.textContent.includes('All'))
        );
        
        if (targetButton) {
            targetButton.classList.add('active');
        }
        
        this.renderNotifications();
    }

    markAsRead(notificationId) {
        if (this.realNotificationSystem) {
            const success = this.realNotificationSystem.markAsRead(notificationId);
            if (success) {
                this.renderNotifications();
                this.updateAllCounts();
                this.showToast('Notification marked as read');
            }
        }
    }

    markAllRead() {
        if (!this.realNotificationSystem) {
            this.showToast('Notification system not ready');
            return;
        }

        const notifications = this.realNotificationSystem.getNotifications();
        const unreadNotifications = notifications.filter(n => !n.read);
        const unreadCount = unreadNotifications.length;
        
        if (unreadCount === 0) {
            this.showToast('No unread notifications');
            return;
        }

        if (confirm(`Mark all ${unreadCount} unread notifications as read?`)) {
            this.realNotificationSystem.markAllAsRead();
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast(`${unreadCount} notifications marked as read`);
        }
    }

    clearAll() {
        if (!this.realNotificationSystem) {
            this.showToast('Notification system not ready');
            return;
        }

        const notifications = this.realNotificationSystem.getNotifications();
        const notificationCount = notifications.length;
        
        if (notificationCount === 0) {
            this.showToast('No notifications to clear');
            return;
        }

        if (confirm(`Clear all ${notificationCount} notifications? This cannot be undone.`)) {
            this.realNotificationSystem.clearAll();
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast('All notifications cleared');
        }
    }

    updateAllCounts() {
        if (!this.realNotificationSystem) return;

        const notifications = this.realNotificationSystem.getNotifications();
        
        const counts = {
            all: notifications.length,
            unread: notifications.filter(n => !n.read).length,
            coaching: notifications.filter(n => n.type === 'coaching').length,
            community: notifications.filter(n => n.type === 'community').length,
            system: notifications.filter(n => n.type === 'system').length,
            billing: notifications.filter(n => n.type === 'billing').length
        };

        // Update count badges
        Object.entries(counts).forEach(([type, count]) => {
            const element = document.getElementById(`${type}Count`);
            if (element) {
                element.textContent = count;
                element.style.display = count > 0 ? 'inline' : 'none';
            }
        });

        // Update sidebar notification badge
        const sidebarBadge = document.getElementById('notificationBadge');
        if (sidebarBadge) {
            const unreadCount = counts.unread;
            sidebarBadge.textContent = unreadCount;
            sidebarBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
        }

        // Update mark all read button state
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.disabled = counts.unread === 0;
            markAllBtn.style.opacity = counts.unread === 0 ? '0.5' : '1';
        }
    }

    // Navigation functions that auto-mark as read
    goToCoach(notificationId) {
        if (notificationId && this.realNotificationSystem) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'ai-coach.html';
    }

    goToCommunity(notificationId) {
        if (notificationId && this.realNotificationSystem) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'community.html';
    }

    goToDashboard(notificationId) {
        if (notificationId && this.realNotificationSystem) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'dashboard.html';
    }

    goToBilling(notificationId) {
        if (notificationId && this.realNotificationSystem) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'billing.html';
    }

    // Utility functions
    formatTimestamp(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            return new Date(date).toLocaleDateString();
        }
    }

    showToast(message) {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        }
    }
}

// Global functions for HTML onclick handlers
function filterNotifications(type) {
    if (window.notificationManager) {
        window.notificationManager.filterNotifications(type);
    }
}

function markAsRead(notificationId) {
    if (window.notificationManager) {
        window.notificationManager.markAsRead(notificationId);
    }
}

function markAllRead() {
    if (window.notificationManager) {
        window.notificationManager.markAllRead();
    }
}

function clearAll() {
    if (window.notificationManager) {
        window.notificationManager.clearAll();
    }
}

function logout() {
    if (window.notificationManager) {
        window.notificationManager.logout();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager = new NotificationManager();
});

// Add required CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .notification-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .notification-icon.coaching {
        background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
        color: white;
    }

    .notification-icon.community {
        background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
        color: white;
    }

    .notification-icon.system {
        background: linear-gradient(135deg, var(--text-secondary) 0%, var(--text-primary) 100%);
        color: white;
    }

    .notification-icon.billing {
        background: linear-gradient(135deg, var(--warning) 0%, #f97316 100%);
        color: white;
    }

    .btn-link {
        background: none;
        border: none;
        color: var(--primary);
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0;
        text-decoration: underline;
        transition: color 0.2s;
        font-weight: 500;
        margin-right: 1rem;
    }

    .btn-link:hover {
        color: var(--primary-dark);
        text-decoration: none;
    }
`;

document.head.appendChild(style);

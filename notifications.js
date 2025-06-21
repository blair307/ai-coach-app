// Fixed Notifications JavaScript - Actually Working
class NotificationManager {
    constructor() {
        this.currentFilter = 'all';
        this.notifications = [];
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadNotifications();
        this.updateAllCounts();
        this.setupEventListeners();
        this.updateBranding();
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
        const savedNotifications = localStorage.getItem('eeh_notifications');
        if (savedNotifications) {
            this.notifications = JSON.parse(savedNotifications);
        } else {
            this.notifications = this.getSampleNotifications();
            this.saveNotifications();
        }

        this.renderNotifications();
        this.updateAllCounts();
    }

    getSampleNotifications() {
        return [
            {
                id: '1',
                type: 'coaching',
                title: 'New Coaching Insights Available',
                message: 'Your AI coach has generated new insights based on your recent conversations. Review your personalized recommendations for emotional wellness and business growth.',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                read: false
            },
            {
                id: '2',
                type: 'community',
                title: 'New Messages in Business Growth',
                message: 'Sarah Johnson and 3 others have shared new insights in the Business Growth room. Join the conversation about scaling strategies.',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
                read: false
            },
            {
                id: '3',
                type: 'system',
                title: 'Weekly Progress Report Ready',
                message: 'Your weekly emotional health and business progress report is now available. See your growth patterns and achievements.',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                read: false
            },
            {
                id: '4',
                type: 'coaching',
                title: 'Goal Achievement Milestone',
                message: 'Congratulations! You\'ve completed 75% of your quarterly emotional wellness goals. Your AI coach has updated your action plan.',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                read: true
            },
            {
                id: '5',
                type: 'community',
                title: 'Someone Mentioned You',
                message: 'Mike Chen mentioned you in the Success Stories room. Check out the discussion about overcoming entrepreneurial challenges.',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                read: true
            },
            {
                id: '6',
                type: 'system',
                title: 'Platform Update: New Features',
                message: 'We\'ve added new emotional intelligence tracking features and enhanced AI coaching capabilities.',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                read: true
            },
            {
                id: '7',
                type: 'billing',
                title: 'Payment Successful',
                message: 'Your yearly subscription payment of $929 has been processed successfully.',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                read: true
            }
        ];
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;

        const filteredNotifications = this.getFilteredNotifications();
        
        if (filteredNotifications.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';
        
        container.innerHTML = filteredNotifications.map(notification => 
            this.createNotificationHTML(notification)
        ).join('');
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

    getFilteredNotifications() {
        return this.notifications.filter(notification => {
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
        console.log('Marking as read:', notificationId);
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.saveNotifications();
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast('Notification marked as read');
        }
    }

    markAllRead() {
        const unreadNotifications = this.notifications.filter(n => !n.read);
        const unreadCount = unreadNotifications.length;
        
        if (unreadCount === 0) {
            this.showToast('No unread notifications');
            return;
        }

        if (confirm(`Mark all ${unreadCount} unread notifications as read?`)) {
            unreadNotifications.forEach(notification => {
                notification.read = true;
            });
            
            this.saveNotifications();
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast(`${unreadCount} notifications marked as read`);
        }
    }

    clearAll() {
        const notificationCount = this.notifications.length;
        
        if (notificationCount === 0) {
            this.showToast('No notifications to clear');
            return;
        }

        if (confirm(`Clear all ${notificationCount} notifications? This cannot be undone.`)) {
            this.notifications = [];
            this.saveNotifications();
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast('All notifications cleared');
        }
    }

    updateAllCounts() {
        const counts = {
            all: this.notifications.length,
            unread: this.notifications.filter(n => !n.read).length,
            coaching: this.notifications.filter(n => n.type === 'coaching').length,
            community: this.notifications.filter(n => n.type === 'community').length,
            system: this.notifications.filter(n => n.type === 'system').length,
            billing: this.notifications.filter(n => n.type === 'billing').length
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
        if (notificationId) {
            this.markAsRead(notificationId);
        }
        window.location.href = 'ai-coach.html';
    }

    goToCommunity(notificationId) {
        if (notificationId) {
            this.markAsRead(notificationId);
        }
        window.location.href = 'community.html';
    }

    goToDashboard(notificationId) {
        if (notificationId) {
            this.markAsRead(notificationId);
        }
        window.location.href = 'dashboard.html';
    }

    goToBilling(notificationId) {
        if (notificationId) {
            this.markAsRead(notificationId);
        }
        window.location.href = 'billing.html';
    }

    // Utility functions
    saveNotifications() {
        localStorage.setItem('eeh_notifications', JSON.stringify(this.notifications));
    }

    loadSettings() {
        const saved = localStorage.getItem('eeh_notificationSettings');
        return saved ? JSON.parse(saved) : {
            coachingInsights: true,
            communityMessages: true,
            weeklyReports: true,
            billingUpdates: true
        };
    }

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

// Fixed Notifications JavaScript - Standalone Working Version
class RealNotificationSystem {
    constructor() {
        this.notifications = this.loadNotifications();
        this.lastChecked = this.getLastChecked();
        this.init();
    }

    init() {
        this.generateNotificationsFromActivity();
        this.saveNotifications();
    }

    generateNotificationsFromActivity() {
        const now = new Date();
        
        // Check for new AI coach insights
        this.checkCoachingActivity();
        
        // Check for community activity
        this.checkCommunityActivity();
        
        // Check for goal progress
        this.checkGoalProgress();
        
        // Check for streak achievements
        this.checkStreakAchievements();
        
        // Check for weekly reports
        this.checkWeeklyReports();
        
        // Update last checked time
        this.lastChecked = now;
        localStorage.setItem('eeh_notifications_last_checked', now.toISOString());
    }

    checkCoachingActivity() {
        const coachHistory = JSON.parse(localStorage.getItem('eeh_coach_conversation') || '[]');
        const userMessages = coachHistory.filter(msg => msg.type === 'user');
        const aiResponses = coachHistory.filter(msg => msg.type === 'assistant');
        
        // Generate insight notification after 5+ conversation exchanges
        if (userMessages.length >= 5 && aiResponses.length >= 5) {
            const lastInsightNotification = this.notifications.find(n => 
                n.type === 'coaching' && n.title.includes('Coaching Insights')
            );
            
            const lastConversation = Math.max(
                ...userMessages.map(msg => new Date(msg.timestamp).getTime()),
                ...aiResponses.map(msg => new Date(msg.timestamp).getTime())
            );
            
            // Only create if it's been more than 1 hour since last insight notification
            if (!lastInsightNotification || 
                (new Date(lastConversation) - new Date(lastInsightNotification.timestamp)) > 3600000) {
                
                this.addNotification({
                    type: 'coaching',
                    title: 'New Coaching Insights Available',
                    message: `Based on your recent ${userMessages.length} conversations, your AI coach has generated new personalized insights about your emotional patterns and growth opportunities.`,
                    actionData: { conversations: userMessages.length }
                });
            }
        }
    }

    checkCommunityActivity() {
        const communityMessages = JSON.parse(localStorage.getItem('eeh_community_messages') || '[]');
        
        // Notification when user becomes active in community
        if (communityMessages.length > 0 && communityMessages.length % 5 === 0) {
            const lastCommunityNotification = this.notifications.find(n => 
                n.type === 'community' && n.title.includes('Community Contribution')
            );
            
            if (!lastCommunityNotification || 
                communityMessages.length > (lastCommunityNotification.actionData?.messageCount || 0)) {
                
                this.addNotification({
                    type: 'community',
                    title: 'Community Contribution Recognized',
                    message: `You've shared ${communityMessages.length} messages with the community. Your peer support is making a difference!`,
                    actionData: { messageCount: communityMessages.length }
                });
            }
        }
    }

    checkGoalProgress() {
        const goals = JSON.parse(localStorage.getItem('eeh_user_goals') || '[]');
        const completedGoals = goals.filter(goal => goal.completed);
        
        // Notification for goal completion
        const lastGoalNotification = this.notifications.find(n => 
            n.type === 'system' && n.title.includes('Goal Completed')
        );
        
        const lastGoalCompletionCount = lastGoalNotification?.actionData?.completedCount || 0;
        
        if (completedGoals.length > lastGoalCompletionCount) {
            const newCompletions = completedGoals.length - lastGoalCompletionCount;
            this.addNotification({
                type: 'system',
                title: `Goal${newCompletions > 1 ? 's' : ''} Completed!`,
                message: `Congratulations! You've completed ${newCompletions} new goal${newCompletions > 1 ? 's' : ''}. You now have ${completedGoals.length} total completed goals.`,
                actionData: { completedCount: completedGoals.length, newCompletions }
            });
        }
    }

    checkStreakAchievements() {
        const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
        const currentStreak = this.calculateCurrentStreak(activityLog);
        
        // Notification for streak milestones
        const streakMilestones = [3, 7, 14, 30];
        
        streakMilestones.forEach(milestone => {
            if (currentStreak === milestone) {
                const existingStreak = this.notifications.find(n => 
                    n.type === 'system' && 
                    n.title.includes(`${milestone}-Day Streak`)
                );
                
                if (!existingStreak) {
                    this.addNotification({
                        type: 'system',
                        title: `${milestone}-Day Streak Achievement!`,
                        message: `Incredible! You've maintained a ${milestone}-day activity streak. Your consistency is paying off!`,
                        actionData: { streakDays: milestone }
                    });
                }
            }
        });
    }

    checkWeeklyReports() {
        const lastWeeklyReport = this.notifications.find(n => 
            n.type === 'system' && n.title.includes('Weekly Report')
        );
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Generate weekly report if it's been a week and user has activity
        const hasActivity = this.hasRecentActivity();
        
        if (hasActivity && (!lastWeeklyReport || new Date(lastWeeklyReport.timestamp) < oneWeekAgo)) {
            const coachMessages = JSON.parse(localStorage.getItem('eeh_coach_conversation') || '[]')
                .filter(msg => msg.type === 'user').length;
            const goals = JSON.parse(localStorage.getItem('eeh_user_goals') || '[]');
            const completedGoals = goals.filter(g => g.completed).length;
            const streak = this.calculateCurrentStreak(JSON.parse(localStorage.getItem('eeh_activity_log') || '[]'));
            
            this.addNotification({
                type: 'system',
                title: 'Weekly Progress Report Ready',
                message: `Your weekly summary: ${coachMessages} coaching sessions, ${completedGoals}/${goals.length} goals completed, ${streak}-day streak. See your detailed progress in the dashboard.`,
                actionData: { 
                    reportDate: now.toISOString(),
                    coachSessions: coachMessages,
                    goals: { completed: completedGoals, total: goals.length },
                    streak 
                }
            });
        }
    }

    calculateCurrentStreak(activityLog) {
        if (activityLog.length === 0) return 0;
        
        const today = new Date().toDateString();
        const sortedDates = activityLog.map(date => new Date(date)).sort((a, b) => b - a);
        
        let streak = 0;
        let currentDate = new Date();
        
        // Check if active today
        const activeToday = sortedDates.some(date => date.toDateString() === today);
        if (!activeToday) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        for (let date of sortedDates) {
            if (date.toDateString() === currentDate.toDateString()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (date < currentDate) {
                break;
            }
        }
        
        return streak;
    }

    hasRecentActivity() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Check coach activity
        const coachHistory = JSON.parse(localStorage.getItem('eeh_coach_conversation') || '[]');
        const recentCoachActivity = coachHistory.some(msg => new Date(msg.timestamp) > oneWeekAgo);
        
        // Check community activity
        const communityHistory = JSON.parse(localStorage.getItem('eeh_community_messages') || '[]');
        const recentCommunityActivity = communityHistory.some(msg => new Date(msg.timestamp) > oneWeekAgo);
        
        // Check goal activity
        const goals = JSON.parse(localStorage.getItem('eeh_user_goals') || '[]');
        const recentGoalActivity = goals.some(goal => 
            goal.createdAt && new Date(goal.createdAt) > oneWeekAgo
        );
        
        return recentCoachActivity || recentCommunityActivity || recentGoalActivity;
    }

    addNotification(notificationData) {
        const notification = {
            id: this.generateId(),
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            timestamp: new Date(),
            read: false,
            actionData: notificationData.actionData || {}
        };
        
        // Avoid duplicates
        const isDuplicate = this.notifications.some(n => 
            n.title === notification.title && 
            Math.abs(new Date(n.timestamp) - notification.timestamp) < 60000 // Within 1 minute
        );
        
        if (!isDuplicate) {
            this.notifications.unshift(notification); // Add to beginning
            
            // Keep only last 50 notifications
            if (this.notifications.length > 50) {
                this.notifications = this.notifications.slice(0, 50);
            }
        }
    }

    generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadNotifications() {
        const saved = localStorage.getItem('eeh_notifications');
        if (saved) {
            return JSON.parse(saved);
        } else {
            // Create sample notifications for new users
            return this.getSampleNotifications();
        }
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
            }
        ];
    }

    saveNotifications() {
        localStorage.setItem('eeh_notifications', JSON.stringify(this.notifications));
    }

    getLastChecked() {
        const saved = localStorage.getItem('eeh_notifications_last_checked');
        return saved ? new Date(saved) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    getNotifications() {
        return this.notifications;
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            return true;
        }
        return false;
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
    }

    clearAll() {
        this.notifications = [];
        this.saveNotifications();
    }
}

// Main Notification Manager
class NotificationManager {
    constructor() {
        this.currentFilter = 'all';
        this.realNotificationSystem = new RealNotificationSystem();
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
        // Auto-refresh notifications every 30 seconds
        setInterval(() => {
            this.realNotificationSystem.generateNotificationsFromActivity();
            this.loadNotifications();
            this.updateAllCounts();
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
        this.realNotificationSystem.generateNotificationsFromActivity();
        this.renderNotifications();
        this.updateAllCounts();
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;

        const notifications = this.realNotificationSystem.getNotifications();
        const filteredNotifications = this.getFilteredNotifications(notifications);
        
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
        const success = this.realNotificationSystem.markAsRead(notificationId);
        if (success) {
            this.renderNotifications();
            this.updateAllCounts();
            this.showToast('Notification marked as read');
        }
    }

    markAllRead() {
        const notifications = this.realNotificationSystem.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        
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

    // Navigation functions
    goToCoach(notificationId) {
        if (notificationId) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'ai-coach.html';
    }

    goToCommunity(notificationId) {
        if (notificationId) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'community.html';
    }

    goToDashboard(notificationId) {
        if (notificationId) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'dashboard.html';
    }

    goToBilling(notificationId) {
        if (notificationId) {
            this.realNotificationSystem.markAsRead(notificationId);
        }
        window.location.href = 'billing.html';
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

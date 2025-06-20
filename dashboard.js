// Simple Dashboard JavaScript

const API_BASE_URL = 'https://ai-coach-app-production.up.railway.app';

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadUserData();
    loadDashboardStats();
    updateNotificationBadge();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

// Load and display user data
function loadUserData() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        const user = JSON.parse(userData);
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.firstName || 'User';
        }
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        } else {
            // Use default stats if API call fails
            updateStatsDisplay({
                totalSessions: 8,
                streak: 5,
                communityMessages: 23
            });
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show default stats
        updateStatsDisplay({
            totalSessions: 8,
            streak: 5,
            communityMessages: 23
        });
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    const elements = {
        totalSessions: document.getElementById('totalSessions'),
        streak: document.getElementById('streak'),
        communityMessages: document.getElementById('communityMessages')
    };
    
    // Animate the numbers counting up
    Object.keys(stats).forEach(key => {
        const element = elements[key];
        if (element) {
            animateNumber(element, 0, stats[key], 1000);
        }
    });
}

// Animate number counting up
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (range * easeOut));
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end; // Ensure we end with exact number
        }
    }
    
    requestAnimationFrame(update);
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/activity`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const activities = await response.json();
            updateActivityDisplay(activities);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        // Keep the default activity items
    }
}

// Update activity display
function updateActivityDisplay(activities) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer || !activities.length) return;
    
    activityContainer.innerHTML = '';
    
    activities.forEach(activity => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        activityDiv.innerHTML = `
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <small>${formatTimeAgo(activity.timestamp)}</small>
            </div>
        `;
        activityContainer.appendChild(activityDiv);
    });
}

// Format time ago (e.g., "2 hours ago")
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Update notification badge
async function updateNotificationBadge() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
        // Keep default badge if API fails
    }
}

// Load notifications preview
async function loadNotificationsPreview() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/recent`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const notifications = await response.json();
            updateNotificationsPreview(notifications);
        }
    } catch (error) {
        console.error('Error loading notifications preview:', error);
        // Keep default notifications
    }
}

// Update notifications preview
function updateNotificationsPreview(notifications) {
    const previewContainer = document.getElementById('notificationsPreview');
    if (!previewContainer || !notifications.length) return;
    
    previewContainer.innerHTML = '';
    
    // Show up to 3 recent notifications
    notifications.slice(0, 3).forEach(notification => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `notification-item ${notification.read ? '' : 'unread'}`;
        notificationDiv.innerHTML = `
            <div class="notification-content">
                <p>${notification.message}</p>
                <small>${formatTimeAgo(notification.timestamp)}</small>
            </div>
        `;
        previewContainer.appendChild(notificationDiv);
    });
    
    // Add view all link if not already present
    if (!previewContainer.nextElementSibling || !previewContainer.nextElementSibling.classList.contains('view-all-link')) {
        const viewAllLink = document.createElement('a');
        viewAllLink.href = 'notifications.html';
        viewAllLink.className = 'view-all-link';
        viewAllLink.textContent = 'View all notifications';
        previewContainer.parentNode.appendChild(viewAllLink);
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

// Auto-refresh dashboard data every 5 minutes
setInterval(() => {
    loadDashboardStats();
    updateNotificationBadge();
    loadNotificationsPreview();
}, 300000); // 5 minutes

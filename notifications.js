// Simple Notifications JavaScript

// Check if user is logged in when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    updateUnreadCount();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Filter notifications by type
function filterNotifications(type) {
    const notifications = document.querySelectorAll('.notification-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const emptyState = document.getElementById('emptyState');
    
    // Update active filter button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let visibleCount = 0;
    
    notifications.forEach(notification => {
        const notificationType = notification.getAttribute('data-type');
        const isUnread = notification.classList.contains('unread');
        
        let shouldShow = false;
        
        switch(type) {
            case 'all':
                shouldShow = true;
                break;
            case 'unread':
                shouldShow = isUnread;
                break;
            default:
                shouldShow = notificationType === type;
        }
        
        if (shouldShow) {
            notification.style.display = 'flex';
            visibleCount++;
        } else {
            notification.style.display = 'none';
        }
    });
    
    // Show empty state if no notifications visible
    if (visibleCount === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

// Mark single notification as read
function markAsRead(button) {
    const notification = button.closest('.notification-item');
    notification.classList.remove('unread');
    notification.classList.add('read');
    
    // Remove the mark as read button
    button.remove();
    
    updateUnreadCount();
}

// Mark all notifications as read
function markAllRead() {
    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
    
    unreadNotifications.forEach(notification => {
        notification.classList.remove('unread');
        notification.classList.add('read');
        
        // Remove mark as read buttons
        const markReadBtn = notification.querySelector('.btn-link[onclick*="markAsRead"]');
        if (markReadBtn) {
            markReadBtn.remove();
        }
    });
    
    updateUnreadCount();
    alert('All notifications marked as read!');
}

// Clear all notifications
function clearAll() {
    if (confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        
        const emptyState = document.getElementById('emptyState');
        emptyState.style.display = 'block';
        
        updateUnreadCount();
    }
}

// Update unread count
function updateUnreadCount() {
    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
    const unreadCount = unreadNotifications.length;
    const countElement = document.getElementById('unreadCount');
    
    if (countElement) {
        countElement.textContent = unreadCount;
        
        // Hide count if zero
        if (unreadCount === 0) {
            countElement.style.display = 'none';
        } else {
            countElement.style.display = 'inline';
        }
    }
}

// Navigation functions
function goToCommunity() {
    window.location.href = 'community.html';
}

function goToCoach() {
    window.location.href = 'ai-coach.html';
}

function goToBilling() {
    window.location.href = 'billing.html';
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}
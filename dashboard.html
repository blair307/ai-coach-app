// Dashboard JavaScript - Real Notification Integration + Real Stats
document.addEventListener('DOMContentLoaded', function() {
    // Initialize real notification system if available
    if (!window.realNotificationSystem) {
        // Create a simple fallback notification system
        window.realNotificationSystem = {
            getNotifications: () => JSON.parse(localStorage.getItem('eeh_notifications') || '[]'),
            getUnreadCount: function() {
                return this.getNotifications().filter(n => !n.read).length;
            }
        };
    }
    
    initializeDashboard();
});

function initializeDashboard() {
    updateBranding();
    loadGoals();
    updateRealStats(); // Use real stats instead of fake ones
    loadRealNotifications(); // Use real notification system
    updateRealNotificationBadge(); // Show real count or hide
    
    // Record user visit for activity tracking
    recordActivity();
    
    // Initialize user if new
    initializeNewUser();
}

function updateBranding() {
    document.title = 'Dashboard - Entrepreneur Emotional Health';
    const brandElements = document.querySelectorAll('.sidebar-header h2');
    brandElements.forEach(el => {
        if (el.textContent === 'AI Coach') {
            el.textContent = 'EEH';
        }
    });
}

// NEW: Real notification badge that shows actual count or hides
function updateRealNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge && window.realNotificationSystem) {
        const unreadCount = window.realNotificationSystem.getUnreadCount();
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none'; // Hide when no notifications
        }
    }
}

// Load real notifications generated from user activity
function loadRealNotifications() {
    const notificationsPreview = document.querySelector('.notifications-preview');
    if (!notificationsPreview) return;

    // Get real notifications from the notification system
    const notificationSystem = window.realNotificationSystem;
    if (!notificationSystem) {
        notificationsPreview.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
                <p>Loading notifications...</p>
            </div>
        `;
        return;
    }

    const notifications = notificationSystem.getNotifications();
    const unreadNotifications = notifications
        .filter(n => !n.read)
        .slice(0, 3); // Show only first 3 unread

    if (unreadNotifications.length === 0) {
        notificationsPreview.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--text-muted);">
                <p>No unread notifications</p>
                <small>Keep using the platform to get personalized updates!</small>
            </div>
        `;
    } else {
        notificationsPreview.innerHTML = unreadNotifications.map(notification => `
            <div class="notification-item unread" onclick="goToNotification('${notification.id}')">
                <div class="notification-content">
                    <p>${notification.title}</p>
                    <small>${formatTimestamp(notification.timestamp)}</small>
                </div>
            </div>
        `).join('');
    }
}

// Navigate to notification and mark as read
function goToNotification(notificationId) {
    if (window.realNotificationSystem) {
        window.realNotificationSystem.markAsRead(notificationId);
    }
    window.location.href = 'notifications.html';
}

// NEW: Update stats with REAL user data
function updateRealStats() {
    // Get REAL coaching sessions count
    const coachingHistory = localStorage.getItem('eeh_coach_conversation');
    const sessions = coachingHistory ? JSON.parse(coachingHistory).filter(msg => msg.type === 'user').length : 0;
    
    // Get REAL community posts count
    const communityHistory = localStorage.getItem('eeh_community_messages');
    const posts = communityHistory ? JSON.parse(communityHistory).filter(msg => msg.type === 'user').length : 0;
    
    // Get REAL day streak
    const dayStreak = calculateRealDayStreak();
    
    // Get REAL active goals count
    const goals = getActiveGoals();
    const activeGoalsCount = goals.filter(goal => !goal.completed).length;
    
    // Update the stats display
    const statsElements = document.querySelectorAll('.stat-number');
    if (statsElements.length >= 4) {
        statsElements[0].textContent = sessions;
        statsElements[1].textContent = dayStreak;
        statsElements[2].textContent = posts;
        statsElements[3].textContent = activeGoalsCount;
    }
    
    // Update the labels to be accurate
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 4) {
        statLabels[0].textContent = sessions === 1 ? 'Coaching Session' : 'Coaching Sessions';
        statLabels[1].textContent = dayStreak === 1 ? 'Day Active' : 'Days Active';
        statLabels[2].textContent = posts === 1 ? 'Community Post' : 'Community Posts';
        statLabels[3].textContent = activeGoalsCount === 1 ? 'Active Goal' : 'Active Goals';
    }
}

// NEW: Calculate real day streak based on actual activity
function calculateRealDayStreak() {
    const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
    
    // If no activity logged yet, check if user is active today
    if (activityLog.length === 0) {
        const hasActivity = checkTodayActivity();
        if (hasActivity) {
            const today = new Date().toDateString();
            activityLog.push(today);
            localStorage.setItem('eeh_activity_log', JSON.stringify(activityLog));
            return 1; // First day active
        }
        return 0; // No activity yet
    }
    
    // Add today if user is active and not already logged
    const today = new Date().toDateString();
    const hasActivity = checkTodayActivity();
    if (hasActivity && !activityLog.includes(today)) {
        activityLog.push(today);
        localStorage.setItem('eeh_activity_log', JSON.stringify(activityLog));
    }
    
    // Calculate consecutive day streak
    const sortedDates = activityLog.map(date => new Date(date)).sort((a, b) => b - a);
    let streak = 0;
    let currentDate = new Date();
    
    // Start from today or yesterday if not active today
    const activeToday = sortedDates.some(date => date.toDateString() === today);
    if (!activeToday) {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Count consecutive days going backwards
    for (let date of sortedDates) {
        if (date.toDateString() === currentDate.toDateString()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (date < currentDate) {
            break; // Gap in activity
        }
    }
    
    return Math.max(streak, 0);
}

function checkTodayActivity() {
    const today = new Date().toDateString();
    
    // Check if user sent any AI coach messages today
    const coachHistory = localStorage.getItem('eeh_coach_conversation');
    if (coachHistory) {
        const messages = JSON.parse(coachHistory);
        const todayMessages = messages.filter(msg => 
            msg.type === 'user' && new Date(msg.timestamp).toDateString() === today
        );
        if (todayMessages.length > 0) return true;
    }
    
    // Check if user sent any community messages today
    const communityHistory = localStorage.getItem('eeh_community_messages');
    if (communityHistory) {
        const messages = JSON.parse(communityHistory);
        const todayMessages = messages.filter(msg => 
            new Date(msg.timestamp).toDateString() === today
        );
        if (todayMessages.length > 0) return true;
    }
    
    // Check if user completed any goals today
    const goals = JSON.parse(localStorage.getItem('eeh_user_goals') || '[]');
    const todayGoals = goals.filter(goal => 
        goal.completedAt && new Date(goal.completedAt).toDateString() === today
    );
    if (todayGoals.length > 0) return true;
    
    // Check if user visited today (simple presence check)
    const lastVisit = localStorage.getItem('eeh_last_visit');
    if (lastVisit && new Date(lastVisit).toDateString() === today) {
        return true;
    }
    
    // Record visit as activity
    localStorage.setItem('eeh_last_visit', new Date().toISOString());
    return true;
}

function getActiveGoals() {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    return savedGoals ? JSON.parse(savedGoals) : [];
}

function loadGoals() {
    const goals = getActiveGoals();
    updateGoalDisplay(goals);
}

function updateGoalDisplay(goals) {
    const goalsList = document.querySelector('.goals-list');
    if (goalsList && goals) {
        goalsList.innerHTML = goals.map((goal, index) => `
            <div class="goal-item">
                <input type="checkbox" ${goal.completed ? 'checked' : ''} id="goal${index}" onchange="toggleGoal(${index})">
                <label for="goal${index}">${goal.text}</label>
            </div>
        `).join('');
    }
    
    // Update stats after goals are loaded
    updateRealStats();
}

function toggleGoal(index) {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        goals[index].completed = !goals[index].completed;
        
        // Track completion time for activity tracking
        if (goals[index].completed) {
            goals[index].completedAt = new Date().toISOString();
        } else {
            delete goals[index].completedAt;
        }
        
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        
        // Update displays
        updateGoalDisplay(goals);
        updateRealStats();
        
        // Show feedback
        showToast(goals[index].completed ? 'Goal marked as complete!' : 'Goal marked as incomplete');
        
        // Record activity for streak
        recordActivity();
        
        // Trigger notification system update if available
        if (window.realNotificationSystem && window.realNotificationSystem.generateNotificationsFromActivity) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            setTimeout(() => {
                loadRealNotifications();
                updateRealNotificationBadge();
            }, 100);
        }
    }
}

function addGoal() {
    const newGoal = prompt('Enter your new goal:');
    if (newGoal && newGoal.trim()) {
        const savedGoals = localStorage.getItem('eeh_user_goals');
        const goals = savedGoals ? JSON.parse(savedGoals) : [];
        
        goals.push({
            text: newGoal.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        });
        
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        updateGoalDisplay(goals);
        showToast('New goal added successfully!');
        recordActivity();
        
        // Trigger notification system update if available
        if (window.realNotificationSystem && window.realNotificationSystem.generateNotificationsFromActivity) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            setTimeout(() => {
                loadRealNotifications();
                updateRealNotificationBadge();
            }, 100);
        }
    }
}

function recordActivity() {
    const today = new Date().toDateString();
    const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
    
    if (!activityLog.includes(today)) {
        activityLog.push(today);
        localStorage.setItem('eeh_activity_log', JSON.stringify(activityLog));
        updateRealStats(); // Update stats when activity is recorded
    }
}

function startCoachingSession() {
    recordActivity();
    window.location.href = 'ai-coach.html?new_session=true';
}

// Format timestamp (same as notification system)
function formatTimestamp(date) {
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

// Initialize new user with realistic starting data
function initializeNewUser() {
    // Check if this is a brand new user
    const hasVisited = localStorage.getItem('eeh_user_initialized');
    if (!hasVisited) {
        // Mark as initialized
        localStorage.setItem('eeh_user_initialized', 'true');
        localStorage.setItem('eeh_user_registration_date', new Date().toISOString());
        
        // Initialize with no goals (user can add their own)
        if (!localStorage.getItem('eeh_user_goals')) {
            localStorage.setItem('eeh_user_goals', JSON.stringify([]));
        }
        
        // Initialize empty activity log (will be populated as user is active)
        if (!localStorage.getItem('eeh_activity_log')) {
            localStorage.setItem('eeh_activity_log', JSON.stringify([]));
        }
        
        console.log('🎉 New user initialized with realistic starting data');
    }
}

// Keep all existing modal and utility functions...
// [Previous modal management functions would go here - keeping them exactly the same]

function manageGoals() {
    const currentGoals = getActiveGoals();
    
    // Create a simple modal instead of using prompt
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Manage Goals</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Current Goals (${currentGoals.length})</h4>
                    <div id="modalGoalsList" style="max-height: 200px; overflow-y: auto;">
                        ${currentGoals.length === 0 ? 
                            '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No goals yet. Add your first goal below!</p>' :
                            currentGoals.map((goal, index) => `
                                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--border);">
                                    <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoalInModal(${index})">
                                    <span style="flex: 1; ${goal.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${goal.text}</span>
                                    <button onclick="deleteGoalInModal(${index})" style="background: var(--error); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: var(--radius); font-size: 0.75rem;">Delete</button>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem;">Add New Goal</h4>
                    <input type="text" id="newGoalInput" placeholder="Enter your new goal..." style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); margin-bottom: 1rem;">
                    <button onclick="addGoalFromModal()" class="btn btn-primary" style="width: 100%;">Add Goal</button>
                </div>
            </div>
        </div>
    `;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('newGoalInput');
        if (input) input.focus();
    }, 100);
}

function showToast(message) {
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

    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

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

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

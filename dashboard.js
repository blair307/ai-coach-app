// Dashboard JavaScript - Real Notification Integration
document.addEventListener('DOMContentLoaded', function() {
    // Initialize real notification system
    if (!window.realNotificationSystem) {
        // Import the notification system (ensure it's loaded first)
        const script = document.createElement('script');
        script.src = 'real-notification-system.js';
        document.head.appendChild(script);
        
        script.onload = function() {
            window.realNotificationSystem = new RealNotificationSystem();
            initializeDashboard();
        };
    } else {
        initializeDashboard();
    }
});

function initializeDashboard() {
    updateBranding();
    loadGoals();
    updateStats();
    loadRealNotifications(); // Use real notification system
    updateNotificationBadge();
    
    // Record user visit for activity tracking
    recordActivity();
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

// Load real notifications generated from user activity
function loadRealNotifications() {
    const notificationsPreview = document.querySelector('.notifications-preview');
    if (!notificationsPreview) return;

    // Get real notifications from the notification system
    const notificationSystem = window.realNotificationSystem;
    if (!notificationSystem) {
        // Fallback if system not loaded
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

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge && window.realNotificationSystem) {
        const unreadCount = window.realNotificationSystem.getUnreadCount();
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
}

function updateStats() {
    // Update coaching sessions count (real user data)
    const coachingHistory = localStorage.getItem('eeh_coach_conversation');
    const sessions = coachingHistory ? JSON.parse(coachingHistory).filter(msg => msg.type === 'user').length : 0;
    
    // Update community posts count (real user data)
    const communityHistory = localStorage.getItem('eeh_community_messages');
    const posts = communityHistory ? JSON.parse(communityHistory).filter(msg => msg.type === 'user').length : 0;
    
    // Update day streak
    const dayStreak = calculateDayStreak();
    
    // Update active goals count
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
    
    // Update the labels to match
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 2) {
        statLabels[1].textContent = 'Day Streak';
    }
}

function calculateDayStreak() {
    const today = new Date().toDateString();
    const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
    
    // If no activity recorded yet, return 0
    if (activityLog.length === 0) return 0;
    
    // Record today's activity if user is active
    const hasActivity = checkTodayActivity();
    if (hasActivity && !activityLog.includes(today)) {
        activityLog.push(today);
        localStorage.setItem('eeh_activity_log', JSON.stringify(activityLog));
        
        // Trigger notification system update when activity changes
        if (window.realNotificationSystem) {
            window.realNotificationSystem.generateNotificationsFromActivity();
        }
    }
    
    // Calculate streak
    let streak = 0;
    const sortedDates = activityLog.map(date => new Date(date)).sort((a, b) => b - a);
    
    if (sortedDates.length === 0) return 0;
    
    // Check if today or yesterday is in the log
    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    
    let currentDate = new Date();
    let foundToday = false;
    
    // Check if user was active today
    for (let date of sortedDates) {
        if (date.toDateString() === today) {
            foundToday = true;
            break;
        }
    }
    
    // If not active today, start from yesterday
    if (!foundToday) {
        currentDate = yesterdayDate;
    }
    
    // Count consecutive days
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
    
    // Check if user visited today (simple presence check)
    const lastVisit = localStorage.getItem('eeh_last_visit');
    if (lastVisit && new Date(lastVisit).toDateString() === today) {
        return true;
    }
    
    // Record visit
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
    updateStats();
}

function toggleGoal(index) {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        goals[index].completed = !goals[index].completed;
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        
        // Update stats immediately
        updateStats();
        
        // Show feedback
        showToast(goals[index].completed ? 'Goal marked as complete!' : 'Goal marked as incomplete');
        
        // Record activity for streak and trigger notifications
        recordActivity();
        
        // Trigger notification system update
        if (window.realNotificationSystem) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            // Refresh notification display
            setTimeout(() => {
                loadRealNotifications();
                updateNotificationBadge();
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
        
        // Trigger notification system update
        if (window.realNotificationSystem) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            setTimeout(() => {
                loadRealNotifications();
                updateNotificationBadge();
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
        updateStats();
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

// (Keep all the existing modal and goal management functions exactly as they were)
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

// Modal goal management functions
function addGoalFromModal() {
    const input = document.getElementById('newGoalInput');
    const goalText = input.value.trim();
    
    if (goalText) {
        const savedGoals = localStorage.getItem('eeh_user_goals');
        const goals = savedGoals ? JSON.parse(savedGoals) : [];
        
        goals.push({
            text: goalText,
            completed: false,
            createdAt: new Date().toISOString()
        });
        
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        
        // Update displays
        updateGoalDisplay(goals);
        updateStats();
        updateInsights();
        recordActivity();
        
        // Clear input and update modal
        input.value = '';
        showToast('Goal added successfully!');
        
        // Update the modal display
        updateModalGoalsList();
        
        // Trigger notification system update
        if (window.realNotificationSystem) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            setTimeout(() => {
                loadRealNotifications();
                updateNotificationBadge();
            }, 100);
        }
    }
}

function toggleGoalInModal(index) {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        goals[index].completed = !goals[index].completed;
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        
        // Update displays
        updateGoalDisplay(goals);
        updateStats();
        updateInsights();
        recordActivity();
        
        // Update modal
        updateModalGoalsList();
        showToast(goals[index].completed ? 'Goal completed!' : 'Goal marked as incomplete');
        
        // Trigger notification system update
        if (window.realNotificationSystem) {
            window.realNotificationSystem.generateNotificationsFromActivity();
            setTimeout(() => {
                loadRealNotifications();
                updateNotificationBadge();
            }, 100);
        }
    }
}

function deleteGoalInModal(index) {
    if (confirm('Are you sure you want to delete this goal?')) {
        const savedGoals = localStorage.getItem('eeh_user_goals');
        if (savedGoals) {
            const goals = JSON.parse(savedGoals);
            goals.splice(index, 1);
            localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
            
            // Update displays
            updateGoalDisplay(goals);
            updateStats();
            updateInsights();
            
            // Update modal
            updateModalGoalsList();
            showToast('Goal deleted');
        }
    }
}

function updateModalGoalsList() {
    const currentGoals = getActiveGoals();
    const modalGoalsList = document.getElementById('modalGoalsList');
    
    if (modalGoalsList) {
        modalGoalsList.innerHTML = currentGoals.length === 0 ? 
            '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No goals yet. Add your first goal below!</p>' :
            currentGoals.map((goal, index) => `
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--border);">
                    <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoalInModal(${index})">
                    <span style="flex: 1; ${goal.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${goal.text}</span>
                    <button onclick="deleteGoalInModal(${index})" style="background: var(--error); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: var(--radius); font-size: 0.75rem;">Delete</button>
                </div>
            `).join('');
    }
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

// Initialize default goals if none exist
function initializeDefaultGoals() {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (!savedGoals) {
        // New users start with NO goals - they add their own
        const defaultGoals = [];
        localStorage.setItem('eeh_user_goals', JSON.stringify(defaultGoals));
        return defaultGoals;
    }
    return JSON.parse(savedGoals);
}

// Generate insights from user data
function updateInsights() {
    const insightsList = document.getElementById('insightsList');
    if (!insightsList) return;
    
    const insights = generateInsightsFromUserData();
    
    if (insights.length === 0) {
        // Show empty state for new users
        insightsList.innerHTML = `
            <div class="empty-insights" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>Start chatting with your AI coach to generate personalized insights!</p>
                <button class="btn btn-primary btn-small" onclick="startCoachingSession()" style="margin-top: 1rem;">
                    Start Your First Session
                </button>
            </div>
        `;
    } else {
        // Show real insights
        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <p>"${insight.text}"</p>
                <small>${insight.source}</small>
            </div>
        `).join('');
    }
}

function generateInsightsFromUserData() {
    // First, get insights generated from actual conversations
    const conversationInsights = JSON.parse(localStorage.getItem('eeh_user_insights') || '[]');
    
    const insights = [];
    
    // Add conversation-based insights (most recent first)
    conversationInsights.slice(0, 2).forEach(insight => {
        insights.push({
            text: insight.text,
            source: insight.source
        });
    });
    
    // Get user's conversation history for additional analysis
    const coachHistory = localStorage.getItem('eeh_coach_conversation');
    const conversations = coachHistory ? JSON.parse(coachHistory) : [];
    
    // Get user's goals
    const goals = getActiveGoals();
    
    // Get activity log
    const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
    
    // Add behavioral insights if we don't have enough conversation insights
    if (insights.length < 3 && conversations.length > 5) {
        const userMessages = conversations.filter(msg => msg.type === 'user');
        
        // Activity pattern insight
        if (activityLog.length > 7 && insights.length < 3) {
            insights.push({
                text: "You're building a consistent habit of self-reflection and growth through regular platform use.",
                source: `Active for ${activityLog.length} days total`
            });
        }
        
        // Goal completion insight
        if (goals.length > 2 && insights.length < 3) {
            const completedGoals = goals.filter(goal => goal.completed).length;
            const completionRate = Math.round((completedGoals / goals.length) * 100);
            
            if (completionRate > 0) {
                insights.push({
                    text: `You have a ${completionRate}% goal completion rate, showing ${completionRate > 50 ? 'strong' : 'developing'} follow-through on commitments.`,
                    source: `Based on ${goals.length} personal goals`
                });
            }
        }
        
        // Engagement insight
        if (userMessages.length > 10 && insights.length < 3) {
            insights.push({
                text: "Your consistent engagement with coaching shows a strong commitment to personal development.",
                source: `From ${userMessages.length} coaching conversations`
            });
        }
    }
    
    // Community insights (if available)
    const communityHistory = localStorage.getItem('eeh_community_messages');
    if (communityHistory && insights.length < 3) {
        const communityMessages = JSON.parse(communityHistory);
        if (communityMessages.length > 5) {
            insights.push({
                text: "Your active participation in the community shows you value peer support and collaboration.",
                source: `From ${communityMessages.length} community interactions`
            });
        }
    }
    
    // Return most recent insights (max 3)
    return insights.slice(0, 3);
}

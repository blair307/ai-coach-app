// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    updateBranding();
    loadGoals();
    updateStats();
    updateNotificationBadge();
});

function updateBranding() {
    document.title = 'Dashboard - Entrepreneur Emotional Health';
    const brandElements = document.querySelectorAll('.sidebar-header h2');
    brandElements.forEach(el => {
        if (el.textContent === 'AI Coach') {
            el.textContent = 'EEH';
        }
    });
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const unreadCount = localStorage.getItem('eeh_unread_count') || '3';
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
        
        // Record activity for streak
        recordActivity();
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

function manageGoals() {
    const currentGoals = getActiveGoals();
    
    let goalText = "Current Goals:\n\n";
    currentGoals.forEach((goal, index) => {
        goalText += `${index + 1}. ${goal.completed ? '✓' : '○'} ${goal.text}\n`;
    });
    
    goalText += "\nWhat would you like to do?\n";
    goalText += "• Add a new goal\n";
    goalText += "• Edit existing goals in the sidebar\n";
    goalText += "• Visit the AI Coach for goal guidance";
    
    const action = prompt(goalText + "\n\nEnter 'add' to add a new goal, or press Cancel:");
    
    if (action && action.toLowerCase() === 'add') {
        addGoal();
    }
}

function startCoachingSession() {
    recordActivity();
    window.location.href = 'ai-coach.html?new_session=true';
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

// Initialize goals and activity tracking on page load
document.addEventListener('DOMContentLoaded', function() {
    const goals = initializeDefaultGoals();
    updateGoalDisplay(goals);
    
    // Initialize activity tracking
    recordActivity();
    
    // Update all stats
    updateStats();
    
    // Load and display insights
    updateInsights();
});

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
    const insights = [];
    
    // Get user's conversation history
    const coachHistory = localStorage.getItem('eeh_coach_conversation');
    const conversations = coachHistory ? JSON.parse(coachHistory) : [];
    
    // Get user's goals
    const goals = getActiveGoals();
    
    // Get activity log
    const activityLog = JSON.parse(localStorage.getItem('eeh_activity_log') || '[]');
    
    // Generate insights based on actual user data
    if (conversations.length > 5) {
        const userMessages = conversations.filter(msg => msg.type === 'user');
        const stressCount = userMessages.filter(msg => 
            msg.content.toLowerCase().includes('stress') || 
            msg.content.toLowerCase().includes('overwhelm')
        ).length;
        
        if (stressCount > 2) {
            insights.push({
                text: "You've mentioned stress multiple times. Consider implementing daily stress management techniques.",
                source: `Based on ${userMessages.length} coaching conversations`
            });
        }
        
        const goalMessages = userMessages.filter(msg => 
            msg.content.toLowerCase().includes('goal') || 
            msg.content.toLowerCase().includes('objective')
        ).length;
        
        if (goalMessages > 1) {
            insights.push({
                text: "You frequently discuss goals, which shows strong self-awareness and growth mindset.",
                source: `Observed in ${goalMessages} conversations`
            });
        }
        
        const teamMessages = userMessages.filter(msg => 
            msg.content.toLowerCase().includes('team') || 
            msg.content.toLowerCase().includes('employee')
        ).length;
        
        if (teamMessages > 1) {
            insights.push({
                text: "Leadership and team dynamics are important to you. Focus on emotional intelligence skills.",
                source: `Pattern from ${teamMessages} team-related discussions`
            });
        }
    }
    
    // Goal-based insights
    if (goals.length > 3) {
        const completedGoals = goals.filter(goal => goal.completed).length;
        const completionRate = Math.round((completedGoals / goals.length) * 100);
        
        if (completionRate > 50) {
            insights.push({
                text: `You have a ${completionRate}% goal completion rate, showing strong follow-through on commitments.`,
                source: `Based on ${goals.length} personal goals`
            });
        }
    }
    
    // Activity-based insights
    if (activityLog.length > 7) {
        insights.push({
            text: "You're building a consistent habit of self-reflection and growth through regular platform use.",
            source: `Active for ${activityLog.length} days total`
        });
    }
    
    // Community insights (if available)
    const communityHistory = localStorage.getItem('eeh_community_messages');
    if (communityHistory) {
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

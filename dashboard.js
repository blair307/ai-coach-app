// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    updateBranding();
    loadGoals();
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

function loadGoals() {
    // Load user goals from localStorage
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        updateGoalDisplay(goals);
    }
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
}

function toggleGoal(index) {
    const savedGoals = localStorage.getItem('eeh_user_goals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        goals[index].completed = !goals[index].completed;
        localStorage.setItem('eeh_user_goals', JSON.stringify(goals));
        
        // Show feedback
        showToast(goals[index].completed ? 'Goal marked as complete!' : 'Goal marked as incomplete');
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
    }
}

function manageGoals() {
    // Simple goal management modal
    const currentGoals = localStorage.getItem('eeh_user_goals');
    const goals = currentGoals ? JSON.parse(currentGoals) : [];
    
    let goalText = "Current Goals:\n\n";
    goals.forEach((goal, index) => {
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
    // Redirect to AI Coach with a session parameter
    window.location.href = 'ai-coach.html?new_session=true';
}

function showToast(message) {
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

    // Add animation CSS if not already present
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
        const defaultGoals = [
            { text: 'Improve work-life balance', completed: true, createdAt: new Date().toISOString() },
            { text: 'Increase emotional intelligence', completed: false, createdAt: new Date().toISOString() },
            { text: 'Build stronger team relationships', completed: true, createdAt: new Date().toISOString() },
            { text: 'Develop stress management skills', completed: false, createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('eeh_user_goals', JSON.stringify(defaultGoals));
        return defaultGoals;
    }
    return JSON.parse(savedGoals);
}

// Initialize goals on page load
document.addEventListener('DOMContentLoaded', function() {
    const goals = initializeDefaultGoals();
    updateGoalDisplay(goals);
});

// goals.js - Database-powered goals management

// Global variables
let currentGoals = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    loadGoalsFromDatabase();
    
    // Close modal when clicking outside
    document.getElementById('addGoalModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAddGoalModal();
        }
    });
    
    console.log('Goals page initialized with database');
});

// Load goals from database
async function loadGoalsFromDatabase() {
    try {
        showLoading();
        currentGoals = await window.goalsAPI.getAll();
        renderGoals();
        updateStats();
    } catch (error) {
        console.error('Error loading goals:', error);
        window.handleAPIError(error);
        // Fallback to empty state
        currentGoals = [];
        renderGoals();
        updateStats();
    } finally {
        hideLoading();
    }
}

// UI Functions
function showAddGoalModal() {
    document.getElementById('addGoalModal').style.display = 'flex';
    document.getElementById('goalTitle').focus();
}

function closeAddGoalModal() {
    document.getElementById('addGoalModal').style.display = 'none';
    document.getElementById('goalForm').reset();
    document.getElementById('goalError').style.display = 'none';
}

async function addGoal(event) {
    event.preventDefault();
    
    const title = document.getElementById('goalTitle').value.trim();
    const frequency = document.getElementById('goalFrequency').value;
    
    if (!title || !frequency) {
        showError('Please fill in all fields');
        return;
    }

    try {
        showButtonLoading('Adding...');
        
        const newGoal = await window.goalsAPI.create({
            title: title,
            frequency: frequency
        });
        
        currentGoals.unshift(newGoal);
        closeAddGoalModal();
        renderGoals();
        updateStats();
        showToast('Goal added successfully!');
        
    } catch (error) {
        console.error('Error adding goal:', error);
        window.handleAPIError(error);
        showError('Error adding goal. Please try again.');
    } finally {
        hideButtonLoading();
    }
}

async function toggleGoalCompletion(goalId) {
    const goalElement = document.querySelector(`[data-goal-id="${goalId}"]`);
    if (goalElement) {
        goalElement.style.opacity = '0.5';
    }

    try {
        const updatedGoal = await window.goalsAPI.toggleComplete(goalId);
        
        // Update local array
        const goalIndex = currentGoals.findIndex(g => g._id === goalId);
        if (goalIndex !== -1) {
            currentGoals[goalIndex] = updatedGoal;
        }
        
        renderGoals();
        updateStats();
        
        const action = updatedGoal.completed ? 'completed' : 'marked incomplete';
        showToast(`Goal ${action}!`);
        
    } catch (error) {
        console.error('Error toggling goal:', error);
        window.handleAPIError(error);
        renderGoals(); // Restore UI state
    }
}

async function deleteGoal(goalId) {
    const goal = currentGoals.find(g => g._id === goalId);
    if (!goal) return;

    if (!confirm(`Are you sure you want to delete "${goal.title}"?`)) {
        return;
    }

    try {
        await window.goalsAPI.delete(goalId);
        
        // Remove from local array
        currentGoals = currentGoals.filter(g => g._id !== goalId);
        
        renderGoals();
        updateStats();
        showToast('Goal deleted successfully');
        
    } catch (error) {
        console.error('Error deleting goal:', error);
        window.handleAPIError(error);
    }
}

function renderGoals() {
    const dailyContainer = document.getElementById('dailyGoals');
    const weeklyContainer = document.getElementById('weeklyGoals');
    const monthlyContainer = document.getElementById('monthlyGoals');
    const emptyState = document.getElementById('emptyState');

    // Clear containers
    dailyContainer.innerHTML = '';
    weeklyContainer.innerHTML = '';
    monthlyContainer.innerHTML = '';

    if (currentGoals.length === 0) {
        emptyState.style.display = 'block';
        document.querySelector('.goals-container').style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.goals-container').style.display = 'block';

    // Group goals by frequency
    const dailyGoals = currentGoals.filter(g => g.frequency === 'daily');
    const weeklyGoals = currentGoals.filter(g => g.frequency === 'weekly');
    const monthlyGoals = currentGoals.filter(g => g.frequency === 'monthly');

    // Render each group
    renderGoalGroup(dailyGoals, dailyContainer);
    renderGoalGroup(weeklyGoals, weeklyContainer);
    renderGoalGroup(monthlyGoals, monthlyContainer);
}

function renderGoalGroup(goals, container) {
    if (goals.length === 0) {
        container.innerHTML = '<p class="no-goals">No goals yet</p>';
        return;
    }

    goals.forEach(goal => {
        const goalElement = document.createElement('div');
        goalElement.className = `goal-item ${goal.completed ? 'completed' : ''}`;
        goalElement.setAttribute('data-goal-id', goal._id);
        
        const streakDisplay = goal.streak > 0 ? `🔥 ${goal.streak}` : goal.streak || 0;
        const lastCompleted = goal.lastCompleted ? 
            `Last completed: ${new Date(goal.lastCompleted).toLocaleDateString()}` : 
            'Never completed';
        
        goalElement.innerHTML = `
            <div class="goal-content">
                <div class="goal-text">
                    <h4>${goal.title}</h4>
                    <div class="goal-stats">
                        <span>Streak: ${streakDisplay}</span>
                        <span title="${lastCompleted}">Created: ${new Date(goal.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="goal-actions">
                    <button class="btn ${goal.completed ? 'btn-completed' : 'btn-incomplete'}" 
                            onclick="toggleGoalCompletion('${goal._id}')">
                        ${goal.completed ? 'Completed' : 'Mark Done'}
                    </button>
                    <button class="btn btn-delete" onclick="deleteGoal('${goal._id}')" title="Delete Goal">
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(goalElement);
    });
}

function updateStats() {
    const totalGoals = currentGoals.length;
    const completedToday = currentGoals.filter(g => g.completed).length;
    const totalStreak = currentGoals.reduce((sum, goal) => sum + (goal.streak || 0), 0);

    document.getElementById('totalGoals').textContent = totalGoals;
    document.getElementById('completedToday').textContent = completedToday;
    document.getElementById('currentStreak').textContent = totalStreak;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const errorElement = document.getElementById('goalError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showLoading() {
    const containers = ['dailyGoals', 'weeklyGoals', 'monthlyGoals'];
    containers.forEach(id => {
        document.getElementById(id).innerHTML = '<p class="loading">Loading...</p>';
    });
}

function hideLoading() {
    // Loading state is cleared by renderGoals()
}

function showButtonLoading(text) {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = text;
        submitBtn.disabled = true;
    }
}

function hideButtonLoading() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add Goal';
        submitBtn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('eeh_token');
    localStorage.removeItem('userData');
    // Note: No longer clearing localStorage goals since they're in database
    window.location.href = 'login.html';
}

// Export functions for global access
window.showAddGoalModal = showAddGoalModal;
window.closeAddGoalModal = closeAddGoalModal;
window.addGoal = addGoal;
window.toggleGoalCompletion = toggleGoalCompletion;
window.deleteGoal = deleteGoal;
window.logout = logout;

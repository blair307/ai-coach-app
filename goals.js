/**
 * Fixed Goals.js - Properly integrates with backend API
 * Replace your existing goals.js with this
 */

class GoalsManager {
    constructor() {
        this.goals = [];
        this.baseURL = 'https://ai-coach-backend-mytn.onrender.com/api';
        this.token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        
        if (!this.token) {
            console.error('No auth token found');
            window.location.href = 'login.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing GoalsManager with backend...');
        await this.loadGoals();
        this.renderGoals();
        this.updateSummary();
    }
    
    // Get authorization headers
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    // Load goals from backend
    async loadGoals() {
        try {
            console.log('📡 Loading goals from backend...');
            const response = await fetch(`${this.baseURL}/goals`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.goals = await response.json();
            console.log('✅ Loaded goals:', this.goals.length);
            
        } catch (error) {
            console.error('❌ Error loading goals:', error);
            this.goals = [];
        }
    }
    
    // Create new goal
    async createGoal(title, frequency) {
        try {
            console.log('🎯 Creating goal:', title, frequency);
            const response = await fetch(`${this.baseURL}/goals`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ title, frequency })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const newGoal = await response.json();
            console.log('✅ Goal created:', newGoal);
            
            this.goals.push(newGoal);
            return newGoal;
            
        } catch (error) {
            console.error('❌ Error creating goal:', error);
            throw error;
        }
    }
    
    // Toggle goal completion
    async toggleGoal(goalId) {
        try {
            console.log('🔄 Toggling goal:', goalId);
            const response = await fetch(`${this.baseURL}/goals/${goalId}/complete`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const updatedGoal = await response.json();
            console.log('✅ Goal toggled:', updatedGoal);
            
            // Update local goal
            const goalIndex = this.goals.findIndex(g => g._id === goalId);
            if (goalIndex !== -1) {
                this.goals[goalIndex] = updatedGoal;
            }
            
            return updatedGoal;
            
        } catch (error) {
            console.error('❌ Error toggling goal:', error);
            throw error;
        }
    }
    
    // Delete goal
    async deleteGoal(goalId) {
        try {
            console.log('🗑️ Deleting goal:', goalId);
            const response = await fetch(`${this.baseURL}/goals/${goalId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ Goal deleted');
            
            // Remove from local array
            this.goals = this.goals.filter(g => g._id !== goalId);
            
        } catch (error) {
            console.error('❌ Error deleting goal:', error);
            throw error;
        }
    }
    
    // Group goals by frequency
    getGoalsByFrequency() {
        return {
            daily: this.goals.filter(g => g.frequency === 'daily'),
            weekly: this.goals.filter(g => g.frequency === 'weekly'),
            monthly: this.goals.filter(g => g.frequency === 'monthly')
        };
    }
    
    // Render goals in UI
    renderGoals() {
        const grouped = this.getGoalsByFrequency();
        
        // Render each frequency group
        this.renderGoalGroup('dailyGoals', grouped.daily);
        this.renderGoalGroup('weeklyGoals', grouped.weekly);
        this.renderGoalGroup('monthlyGoals', grouped.monthly);
        
        // Show/hide empty state
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = this.goals.length === 0 ? 'block' : 'none';
        }
    }
    
    // Render a specific goal group
    renderGoalGroup(containerId, goals) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (goals.length === 0) {
            container.innerHTML = '<div class="no-goals">No goals yet. Create your first goal above!</div>';
            return;
        }
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-item ${goal.completed ? 'completed' : ''}">
                <div class="goal-content">
                    <div class="goal-text">
                        <h4>${goal.title}</h4>
                        <div class="goal-stats">
                            <span>Streak: ${goal.streak || 0}</span>
                            ${goal.lastCompleted ? `<span>Last: ${new Date(goal.lastCompleted).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn ${goal.completed ? 'btn-completed' : 'btn-incomplete'}" 
                                onclick="toggleGoal('${goal._id}')">
                            ${goal.completed ? 'Completed' : 'Mark Complete'}
                        </button>
                        <button class="btn btn-delete" onclick="deleteGoal('${goal._id}')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Update summary statistics
    updateSummary() {
        const completedToday = this.goals.filter(goal => {
            if (!goal.lastCompleted) return false;
            const lastCompleted = new Date(goal.lastCompleted);
            const today = new Date();
            return lastCompleted.toDateString() === today.toDateString();
        }).length;
        
        const bestStreak = Math.max(...this.goals.map(g => g.streak || 0), 0);
        
        document.getElementById('totalGoals').textContent = this.goals.length;
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('currentStreak').textContent = bestStreak;
    }
}

// Initialize goals manager
let goalsManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Goals page initializing...');
    
    // Initialize goals manager
    goalsManager = new GoalsManager();
    
    // Export to global scope for HTML onclick handlers
    window.goalsManager = goalsManager;
    
    console.log('✅ Goals page ready');
});

// Global functions for HTML onclick handlers
window.showAddGoalModal = function() {
    const modal = document.getElementById('addGoalModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('goalTitle').focus();
    }
};

window.closeAddGoalModal = function() {
    const modal = document.getElementById('addGoalModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        document.getElementById('goalForm').reset();
        document.getElementById('goalError').style.display = 'none';
    }
};

window.addGoal = async function(event) {
    if (event) {
        event.preventDefault();
    }
    
    const title = document.getElementById('goalTitle').value.trim();
    const frequency = document.getElementById('goalFrequency').value;
    const errorDiv = document.getElementById('goalError');
    
    // Clear previous errors
    errorDiv.style.display = 'none';
    
    // Validation
    if (!title) {
        errorDiv.textContent = 'Please enter a goal description';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!frequency) {
        errorDiv.textContent = 'Please select a frequency';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!goalsManager) {
        errorDiv.textContent = 'Goals system not ready. Please refresh the page.';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#addGoalModal button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        
        await goalsManager.createGoal(title, frequency);
        
        // Refresh UI
        goalsManager.renderGoals();
        goalsManager.updateSummary();
        
        // Close modal
        window.closeAddGoalModal();
        
        // Show success message
        showToast('Goal created successfully!', 'success');
        
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error creating goal:', error);
        errorDiv.textContent = 'Error creating goal: ' + error.message;
        errorDiv.style.display = 'block';
        
        // Restore button
        const submitBtn = document.querySelector('#addGoalModal button[type="submit"]');
        submitBtn.textContent = 'Add Goal';
        submitBtn.disabled = false;
    }
};

window.toggleGoal = async function(goalId) {
    if (!goalsManager) {
        console.error('GoalsManager not initialized');
        return;
    }
    
    try {
        await goalsManager.toggleGoal(goalId);
        
        // Refresh UI
        goalsManager.renderGoals();
        goalsManager.updateSummary();
        
        showToast('Goal updated!', 'success');
        
    } catch (error) {
        console.error('Error toggling goal:', error);
        showToast('Error updating goal: ' + error.message, 'error');
    }
};

window.deleteGoal = async function(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) {
        return;
    }
    
    if (!goalsManager) {
        console.error('GoalsManager not initialized');
        return;
    }
    
    try {
        await goalsManager.deleteGoal(goalId);
        
        // Refresh UI
        goalsManager.renderGoals();
        goalsManager.updateSummary();
        
        showToast('Goal deleted!', 'success');
        
    } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('Error deleting goal: ' + error.message, 'error');
    }
};

// Toast notification helper
window.showToast = function(message, type = 'info') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#6366f1'
    };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
};

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('addGoalModal');
    if (event.target === modal) {
        window.closeAddGoalModal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        window.closeAddGoalModal();
    }
});

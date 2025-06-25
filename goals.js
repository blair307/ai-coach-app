/**
 * Fixed Goals.js - Properly integrates with backend API for Life Goals
 * This version matches the backend endpoints and fixes delete functionality
 */

class GoalsManager {
    constructor() {
        this.goals = [];
        this.baseURL = 'https://ai-coach-backend-pbse.onrender.com/api';
        this.token = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
        
        if (!this.token) {
            console.error('No auth token found');
            // Don't redirect here, let the page handle it
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
    
    // Load goals from backend - FIXED to use correct endpoint
    async loadGoals() {
        try {
            console.log('📡 Loading goals from backend...');
            const response = await fetch(`${this.baseURL}/life-goals`, {
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
    
    // Create new goal - FIXED to use correct endpoint and data structure
    async createGoal(area, bigGoal, dailyAction) {
        try {
            console.log('🎯 Creating goal:', { area, bigGoal, dailyAction });
            const response = await fetch(`${this.baseURL}/life-goals`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ area, bigGoal, dailyAction })
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
    
    // Toggle goal completion - FIXED to use correct endpoint
    async toggleGoal(goalId, completed) {
        try {
            console.log('🔄 Toggling goal:', goalId, completed);
            const response = await fetch(`${this.baseURL}/life-goals/${goalId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ 
                    completed: completed,
                    lastCompletedDate: completed ? new Date().toISOString() : null
                })
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
    
    // Delete goal - FIXED to use correct endpoint
    async deleteGoal(goalId) {
        try {
            console.log('🗑️ Deleting goal:', goalId);
            const response = await fetch(`${this.baseURL}/life-goals/${goalId}`, {
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
    
    // Group goals by area instead of frequency
    getGoalsByArea() {
        const grouped = {};
        this.goals.forEach(goal => {
            if (!grouped[goal.area]) {
                grouped[goal.area] = [];
            }
            grouped[goal.area].push(goal);
        });
        return grouped;
    }
    
    // Render goals in UI - UPDATED for life goals structure
    renderGoals() {
        const grouped = this.getGoalsByArea();
        
        // Update area stats
        Object.entries(grouped).forEach(([area, goals]) => {
            this.updateAreaStats(area, goals);
        });
        
        // Render goals overview
        this.renderGoalsOverview(grouped);
    }
    
    // Update area statistics
    updateAreaStats(area, goals) {
        const goalsElement = document.getElementById(`${area}-goals`);
        const progressElement = document.getElementById(`${area}-progress`);
        
        if (goalsElement) {
            goalsElement.textContent = goals.length;
        }
        
        if (progressElement) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const completedToday = goals.filter(goal => {
                if (!goal.lastCompletedDate) return false;
                const completedDate = new Date(goal.lastCompletedDate);
                completedDate.setHours(0, 0, 0, 0);
                return completedDate.getTime() === today.getTime();
            }).length;
            
            progressElement.textContent = `${completedToday}/${goals.length}`;
        }
    }
    
    // Render goals overview section
    renderGoalsOverview(grouped) {
        const overviewContainer = document.getElementById('goalsOverview');
        if (!overviewContainer) return;
        
        if (Object.keys(grouped).length === 0) {
            overviewContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Click on any life area above to start setting your first goals!</p>';
            return;
        }
        
        const areaConfig = {
            mind: { color: '#8b5cf6' },
            spirit: { color: '#06b6d4' },
            body: { color: '#10b981' },
            work: { color: '#f59e0b' },
            relationships: { color: '#ec4899' },
            fun: { color: '#f97316' },
            finances: { color: '#059669' }
        };
        
        let html = '';
        Object.entries(grouped).forEach(([area, goals]) => {
            const config = areaConfig[area] || { color: '#6366f1' };
            
            html += `
                <div style="border-left: 4px solid ${config.color}; padding: 1.5rem; margin-bottom: 1rem; background: var(--surface); border-radius: 12px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 1rem 0; color: ${config.color}; text-transform: capitalize; font-size: 1.1rem; font-weight: 600;">${area}</h4>
            `;
            
            goals.forEach(goal => {
                const goalId = goal._id;
                const streak = goal.streak || 0;
                
                html += `
                    <div style="padding: 1rem; margin-bottom: 1rem; background: var(--background); border-radius: 8px; border: 1px solid var(--border); position: relative;">
                        <button onclick="window.goalsManager.deleteGoalWithConfirm('${goalId}', '${area}')" style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;" title="Delete goal">×</button>
                        
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-weight: 500; line-height: 1.4; padding-right: 2rem;">${goal.bigGoal}</p>
                        <p style="margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.9rem;"><strong>Daily Action:</strong> ${goal.dailyAction}</p>
                        <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between;">
                            <div style="display: flex; gap: 1rem;">
                                <button onclick="window.goalsManager.toggleGoalCompletion('${goalId}')" style="background: ${config.color}; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;">${goal.completed ? 'Completed Today' : 'Mark Complete'}</button>
                                <button onclick="goToDailyTracker()" style="background: var(--background); border: 2px solid ${config.color}; color: ${config.color}; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;">Daily Tracker</button>
                            </div>
                            <div style="text-align: center;">
                                <span style="font-size: 1.2rem; font-weight: 700; color: ${config.color};">${streak}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">streak</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        overviewContainer.innerHTML = html;
    }
    
    // Delete goal with confirmation
    async deleteGoalWithConfirm(goalId, area) {
        if (!confirm(`Are you sure you want to delete this ${area} goal? This action cannot be undone.`)) {
            return;
        }
        
        try {
            await this.deleteGoal(goalId);
            this.renderGoals();
            this.updateSummary();
            window.showToast(`${area.charAt(0).toUpperCase() + area.slice(1)} goal deleted successfully!`, 'success');
        } catch (error) {
            console.error('Delete error:', error);
            window.showToast('Error deleting goal: ' + error.message, 'error');
        }
    }
    
    // Toggle goal completion
    async toggleGoalCompletion(goalId) {
        try {
            const goal = this.goals.find(g => g._id === goalId);
            if (!goal) return;
            
            const newCompletedState = !goal.completed;
            await this.toggleGoal(goalId, newCompletedState);
            this.renderGoals();
            this.updateSummary();
            
            const message = newCompletedState ? 'Goal completed! 🎉' : 'Goal marked as incomplete';
            window.showToast(message, 'success');
        } catch (error) {
            console.error('Toggle error:', error);
            window.showToast('Error updating goal: ' + error.message, 'error');
        }
    }
    
    // Update summary statistics
    updateSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const completedToday = this.goals.filter(goal => {
            if (!goal.lastCompletedDate) return false;
            const completedDate = new Date(goal.lastCompletedDate);
            completedDate.setHours(0, 0, 0, 0);
            return completedDate.getTime() === today.getTime();
        }).length;
        
        const bestStreak = Math.max(...this.goals.map(g => g.streak || 0), 0);
        
        // Update dashboard stats if elements exist
        const totalGoalsEl = document.getElementById('totalGoals');
        const completedTodayEl = document.getElementById('completedToday');
        const currentStreakEl = document.getElementById('currentStreak');
        
        if (totalGoalsEl) totalGoalsEl.textContent = this.goals.length;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
        if (currentStreakEl) currentStreakEl.textContent = bestStreak;
    }
}

// Initialize goals manager when DOM is ready
let goalsManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Goals page initializing...');
    
    // Check if we're on the goals page
    if (document.getElementById('goalsOverview')) {
        goalsManager = new GoalsManager();
        window.goalsManager = goalsManager;
        console.log('✅ Goals manager initialized');
    }
});

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
        max-width: 400px;
        font-weight: 500;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4000);
};

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.GoalsManager = GoalsManager;

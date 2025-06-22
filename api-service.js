// Create a new file: api-service.js
// This replaces localStorage with backend API calls

const API_BASE = 'https://ai-coach-backend-mytn.onrender.com/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
}

// GOALS API
window.goalsAPI = {
    async getAll() {
        return apiRequest('/goals');
    },
    
    async create(goal) {
        return apiRequest('/goals', {
            method: 'POST',
            body: JSON.stringify(goal)
        });
    },
    
    async toggleComplete(goalId) {
        return apiRequest(`/goals/${goalId}/complete`, {
            method: 'PUT'
        });
    },
    
    async delete(goalId) {
        return apiRequest(`/goals/${goalId}`, {
            method: 'DELETE'
        });
    }
};

// NOTIFICATIONS API
window.notificationsAPI = {
    async getAll() {
        return apiRequest('/notifications');
    },
    
    async markAsRead(notificationId) {
        return apiRequest(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    },
    
    async delete(notificationId) {
        return apiRequest(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
    }
};

// CHAT ROOMS API
window.roomsAPI = {
    async getAll() {
        return apiRequest('/rooms');
    },
    
    async create(room) {
        return apiRequest('/rooms', {
            method: 'POST',
            body: JSON.stringify(room)
        });
    },
    
    async getMessages(roomId) {
        return apiRequest(`/rooms/${roomId}/messages`);
    },
    
    async sendMessage(roomId, message) {
        return apiRequest(`/rooms/${roomId}/messages`, {
            method: 'POST',
            body: JSON.stringify(message)
        });
    }
};

// ERROR HANDLING
window.handleAPIError = function(error) {
    console.error('API Error:', error);
    
    if (error.message.includes('401')) {
        // Token expired, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('eeh_token');
        window.location.href = 'login.html';
        return;
    }
    
    // Show user-friendly error message
    if (window.showToast) {
        window.showToast('Connection error. Please try again.', 'error');
    } else {
        alert('Something went wrong. Please try again.');
    }
};

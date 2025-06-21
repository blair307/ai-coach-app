// Replace your entire callOpenAI function in ai-coach.js with this:

async function callOpenAI(message, conversationHistory = []) {
    try {
        // Get the auth token (your backend requires authentication)
        const token = localStorage.getItem('eeh_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
        
        if (!token) {
            // Redirect to login if no token
            console.log('No auth token found, redirecting to login');
            window.location.href = 'login.html';
            return "Please log in to continue.";
        }

        console.log('Calling backend API with message:', message);

        // Call your Render backend endpoint
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                chatHistory: conversationHistory
            })
        });

        console.log('Backend response status:', response.status);

        const data = await response.json();
        console.log('Backend response data:', data);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired, redirect to login
                console.log('Token expired, redirecting to login');
                localStorage.removeItem('eeh_token');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return "Session expired. Please log in again.";
            }
            throw new Error(data.message || 'Server error');
        }

        console.log('✅ Got real AI response from backend!');
        return data.response;

    } catch (error) {
        console.error('❌ Frontend API Error:', error);
        
        // If it's a network error, might be trying to call localhost instead of Render
        if (error.message.includes('fetch')) {
            console.error('🔍 Network error - check if calling correct backend URL');
        }
        
        // Entrepreneur-focused fallback messages
        const fallbacks = [
            "I'm experiencing technical difficulties right now. As an entrepreneur, you know that setbacks are temporary. While I get back online, remember that seeking support shows leadership strength, not weakness.",
            "I'm having connection issues at the moment. In the meantime, consider this: the stress you're feeling as an entrepreneur is valid. Take a deep breath and remember that even the most successful founders face similar challenges.",
            "Technical problems on my end right now. Here's a quick reminder while I reconnect: entrepreneurship is inherently stressful, but you're building something meaningful. That pressure you feel? It's often proportional to the impact you're creating."
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

// Also make sure your sendMessage function calls this correctly:
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        console.log('🚀 Sending message to AI...');
        
        // Get conversation history if you have this function
        const conversationHistory = typeof getConversationHistory === 'function' ? getConversationHistory() : [];
        
        // Call your backend through the updated function
        const response = await callOpenAI(message, conversationHistory);
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        addMessage(response, 'ai');
        
        // Save conversation history if you have this function
        if (typeof saveConversationHistory === 'function') {
            saveConversationHistory(message, response);
        }
        
        // Update insights and session count if you have these functions
        if (typeof updateInsights === 'function') {
            updateInsights(response);
        }
        if (typeof incrementSessionCount === 'function') {
            incrementSessionCount();
        }
        
    } catch (error) {
        console.error('❌ Error in sendMessage:', error);
        hideTypingIndicator();
        addMessage("I'm having trouble responding right now. Please try again in a moment.", 'ai');
    }
}
